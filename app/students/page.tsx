'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UserPlus, Phone, Calendar as CalendarIcon, ArrowLeft, Search, UserCircle, Loader2, X, ChevronRight, FileText, Trash2, UserX, Edit2 } from 'lucide-react';
import Link from 'next/link';
import AlertModal from '@/components/AlertModal';
import { useBackClose } from '@/hooks/useBackClose';
export default function StudentManagement() {
    const [students, setStudents] = useState<any[]>([]);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ student: any; mode: 'deactivate' | 'delete' } | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    useBackClose(!!selectedStudent, () => {
        if (isEditing) setIsEditing(false);
        else setSelectedStudent(null);
    });
    useBackClose(isModalOpen, () => setIsModalOpen(false));

    // 입력 폼 상태
    const [name, setName] = useState('');
    const [studentContact, setStudentContact] = useState('');
    const [contact, setContact] = useState('');
    const [tuitionDay, setTuitionDay] = useState('');
    const [memo, setMemo] = useState('');

    // 💡 폼 초기화 함수
    const resetForm = () => {
        setName('');
        setStudentContact('');
        setContact('');
        setTuitionDay('');
        setMemo('');
    };

    // 학생 목록 불러오기
    const fetchStudents = async () => {
        try {
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .order('name', { ascending: true });

            if (error) {
                console.error("Fetch students error:", error);
                setStudents([]);
            } else {
                setStudents(data || []);
            }
        } catch (err) {
            console.error("fetchStudents exception:", err);
            setStudents([]);
        }
    };

    // 유저 권한 정보 불러오기
    const fetchUserRole = async () => {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error || !user) {
                setIsLoading(false);
                return;
            }

            const { data, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profileError) console.error("Profile fetch error:", profileError);
            setUserRole(data?.role || 'teacher');
        } catch (err) {
            console.error("fetchUserRole exception:", err);
        }
    };

    // 💡 휴대폰 번호 자동 하이픈 (-) 함수
    const formatPhone = (val: string) => {
        const digits = val.replace(/[^0-9]/g, '');
        if (digits.length <= 3) return digits;
        if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
        return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
    };

    useEffect(() => {
        async function init() {
            setIsLoading(true);
            try {
                // 💡 Requirement 2: 세션 체크 강화
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    window.location.href = '/'; // Auth 컴포넌트가 루트에 있으므로 루트로 보냄
                    return;
                }
                await Promise.all([fetchStudents(), fetchUserRole()]);
            } catch (err) {
                console.error("Students page init error:", err);
            } finally {
                // 💡 Requirement 1: 로딩 종료 보장
                setIsLoading(false);
            }
        }
        init();
    }, []);

    // 학생 등록 함수
    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('students').insert([
            {
                name,
                student_contact: studentContact,
                parent_contact: contact,
                tuition_day: tuitionDay ? parseInt(tuitionDay) : null,
                memo,
                teacher_id: user?.id
            }
        ]);

        if (!error) {
            setIsModalOpen(false);
            resetForm();
            fetchStudents();
        }
    };

    const handleEditClick = () => {
        if (!selectedStudent) return;
        setName(selectedStudent.name || '');
        setStudentContact(selectedStudent.student_contact || '');
        setContact(selectedStudent.parent_contact || '');
        setTuitionDay(selectedStudent.tuition_day ? selectedStudent.tuition_day.toString() : '');
        setMemo(selectedStudent.memo || '');
        setIsEditing(true);
    };

    const handleUpdateStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent) return;

        const updatedData = {
            name,
            student_contact: studentContact,
            parent_contact: contact,
            tuition_day: tuitionDay ? parseInt(tuitionDay) : null,
            memo
        };

        const { error } = await supabase
            .from('students')
            .update(updatedData)
            .eq('id', selectedStudent.id);

        if (!error) {
            setIsEditing(false);
            setSelectedStudent({ ...selectedStudent, ...updatedData });
            fetchStudents();
        } else {
            alert('수정 실패: ' + error.message);
        }
    };

    const filteredStudents = students
        .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            // 활성 학생 먼저, 비활성 학생 최하단
            if (a.is_active !== false && b.is_active === false) return -1;
            if (a.is_active === false && b.is_active !== false) return 1;
            return (a.name || '').localeCompare(b.name || '', 'ko');
        });

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 py-6 px-2 md:py-12 md:px-8">
            <div className="max-w-7xl mx-auto">
                {/* 상단 헤더 영역 (Header.tsx 구조 복제) */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 px-4 gap-6">
                    <div className="flex items-start justify-between w-full md:w-auto md:justify-start md:gap-8">
                        <div>
                            <h1 className="text-4xl font-bold tracking-tighter text-slate-900 italic">
                                Student <span className="text-emerald-600">List</span>
                            </h1>
                            <p className="text-slate-500 font-bold mt-1.5 flex items-center gap-1.5 px-1">
                                <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                우리 센터의 학생들 ({students.length}명)
                            </p>
                        </div>
                        <Link href="/" className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 mt-1">
                            <ArrowLeft size={20} strokeWidth={3} />
                        </Link>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button
                            onClick={() => {
                                if (userRole !== 'admin') {
                                    setIsAlertOpen(true);
                                    return;
                                }
                                resetForm();
                                setIsModalOpen(true);
                            }}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
                        >
                            <UserPlus size={18} />
                            신규 학생 등록
                        </button>
                    </div>
                </header>

                <div className="px-4">
                    {/* 검색 바 */}
                    <div className="relative mb-5 group">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="이름으로 학생 찾기..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium placeholder:text-slate-300 text-sm"
                        />
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center p-20"><Loader2 className="animate-spin text-emerald-600" size={40} /></div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                            {filteredStudents.map((student) => (
                                <button
                                    key={student.id}
                                    onClick={() => setSelectedStudent(student)}
                                    className={`py-3.5 px-4 rounded-2xl border shadow-sm hover:shadow-md transition-all active:scale-[0.97] flex items-center gap-3 text-left ${student.is_active === false
                                        ? 'bg-slate-50 border-slate-200 opacity-50'
                                        : 'bg-white border-slate-100 hover:border-emerald-200'
                                        }`}
                                >
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${student.is_active === false
                                        ? 'bg-slate-100 text-slate-400'
                                        : 'bg-emerald-50 text-emerald-600'
                                        }`}>
                                        <UserCircle size={20} />
                                    </div>
                                    <span className={`text-[15px] font-bold truncate ${student.is_active === false ? 'text-slate-400' : 'text-slate-800'
                                        }`}>{student.name}</span>
                                    <ChevronRight size={14} className="text-slate-300 ml-auto shrink-0" />
                                </button>
                            ))}

                            {filteredStudents.length === 0 && (
                                <div className="col-span-full py-20 text-center">
                                    <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-50 rounded-2xl mb-3">
                                        <Search size={22} className="text-slate-300" />
                                    </div>
                                    <p className="text-slate-400 font-bold text-sm">찾으시는 학생이 없습니다.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 학생 상세 슬라이드 패널 */}
            {selectedStudent !== null && (
                <div className="fixed inset-0 z-50">
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
                        onClick={() => setSelectedStudent(null)}
                    />
                    <div
                        className="absolute top-0 right-0 h-full w-[90%] max-w-md bg-white shadow-2xl animate-slide-in-right"
                    >
                        <div className="flex flex-col h-full">
                            {/* 헤더 */}
                            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                                        <UserCircle size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900">{selectedStudent.name}</h3>
                                        <p className="text-xs text-slate-400 font-medium">{isEditing ? '학생 정보 수정' : '학생 정보'}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {!isEditing && (
                                        <button
                                            onClick={handleEditClick}
                                            className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                                        >
                                            <Edit2 size={20} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            if (isEditing) setIsEditing(false);
                                            else setSelectedStudent(null);
                                        }}
                                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* 상세 정보 / 수정 폼 영역 */}
                            {isEditing ? (
                                <div className="flex-1 overflow-y-auto p-5">
                                    <form id="edit-student-form" onSubmit={handleUpdateStudent} className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-400 ml-1">이름</label>
                                            <input placeholder="이름을 입력하세요" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border border-transparent focus:border-emerald-500 focus:bg-white outline-none font-bold transition-all text-slate-900" required />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-400 ml-1">학생 연락처</label>
                                            <input placeholder="010-0000-0000" value={studentContact} onChange={e => setStudentContact(formatPhone(e.target.value))} className="w-full p-4 bg-slate-50 rounded-2xl border border-transparent focus:border-emerald-500 focus:bg-white outline-none font-bold transition-all text-slate-900" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-400 ml-1">학부모 연락처</label>
                                            <input placeholder="010-0000-0000" value={contact} onChange={e => setContact(formatPhone(e.target.value))} className="w-full p-4 bg-slate-50 rounded-2xl border border-transparent focus:border-emerald-500 focus:bg-white outline-none font-bold transition-all text-slate-900" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-400 ml-1">수강료 결제일 (1~31)</label>
                                            <input type="number" placeholder="일자만 입력 (예: 15)" value={tuitionDay} onChange={e => setTuitionDay(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border border-transparent focus:border-emerald-500 focus:bg-white outline-none font-bold transition-all text-slate-900" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-400 ml-1">특이사항 (메모)</label>
                                            <textarea placeholder="학생에 대한 간단한 메모를 남겨주세요" value={memo} onChange={e => setMemo(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border border-transparent focus:border-emerald-500 focus:bg-white outline-none font-bold transition-all h-32 text-slate-900" />
                                        </div>

                                        <div className="flex gap-3 pt-4 pb-4">
                                            <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-3.5 font-bold text-slate-400 hover:text-slate-600 transition-colors">취소</button>
                                            <button type="submit" className="flex-1 py-3.5 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all">수정완료</button>
                                        </div>
                                    </form>
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                    {/* 학생 연락처 */}
                                    <div className="bg-slate-50 rounded-2xl p-4">
                                        <p className="text-xs font-medium text-slate-400 mb-2">학생 연락처</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-lg font-bold text-slate-800">{selectedStudent.student_contact || '-'}</span>
                                            {selectedStudent.student_contact && (
                                                <a href={`tel:${selectedStudent.student_contact}`} className="p-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all active:scale-95 shadow-sm">
                                                    <Phone size={16} fill="currentColor" />
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {/* 학부모 연락처 */}
                                    <div className="bg-slate-50 rounded-2xl p-4">
                                        <p className="text-xs font-medium text-slate-400 mb-2">학부모 연락처</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-lg font-bold text-slate-800">{selectedStudent.parent_contact || '-'}</span>
                                            {selectedStudent.parent_contact && (
                                                <a href={`tel:${selectedStudent.parent_contact}`} className="p-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all active:scale-95 shadow-sm">
                                                    <Phone size={16} fill="currentColor" />
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {/* 결제일 */}
                                    <div className="bg-slate-50 rounded-2xl p-4">
                                        <p className="text-xs font-medium text-slate-400 mb-2">수강료 결제일</p>
                                        <div className="flex items-center gap-2">
                                            <CalendarIcon size={18} className="text-emerald-500" />
                                            <span className="text-lg font-bold text-slate-800">매월 {selectedStudent.tuition_day || '-'}일</span>
                                        </div>
                                    </div>

                                    {/* 메모 */}
                                    <div className="bg-slate-50 rounded-2xl p-4">
                                        <p className="text-xs font-medium text-slate-400 mb-2">특이사항</p>
                                        <div className="flex items-start gap-2">
                                            <FileText size={16} className="text-slate-400 mt-0.5 shrink-0" />
                                            <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                                                {selectedStudent.memo || '등록된 특이사항이 없습니다.'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* 비활성화 / 데이터 삭제 */}
                                    <div className="flex gap-3 pt-6 pb-2">
                                        <button
                                            onClick={() => setDeleteTarget({ student: selectedStudent, mode: 'deactivate' })}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl transition-all text-[14px] font-bold border ${selectedStudent.is_active === false
                                                ? 'text-emerald-500 hover:bg-emerald-50 border-emerald-200'
                                                : 'text-amber-500 hover:bg-amber-50 border-amber-200'
                                                }`}
                                        >
                                            <UserX size={18} />
                                            {selectedStudent.is_active === false ? '활성화' : '비활성화'}
                                        </button>
                                        <button
                                            onClick={() => setDeleteTarget({ student: selectedStudent, mode: 'delete' })}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all text-[14px] font-bold border border-rose-200"
                                        >
                                            <Trash2 size={18} />
                                            데이터 삭제
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 확인 모달 (비활성화 / 데이터 삭제 공용) */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[90] p-6">
                    <div className="bg-white w-full max-w-xs rounded-3xl p-6 shadow-2xl text-center">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${deleteTarget.mode === 'deactivate'
                            ? (deleteTarget.student.is_active === false ? 'bg-emerald-50' : 'bg-amber-50')
                            : 'bg-rose-50'
                            }`}>
                            {deleteTarget.mode === 'deactivate'
                                ? <UserX size={24} className={deleteTarget.student.is_active === false ? 'text-emerald-500' : 'text-amber-500'} />
                                : <Trash2 size={24} className="text-rose-500" />}
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">
                            {deleteTarget.mode === 'deactivate'
                                ? (deleteTarget.student.is_active === false ? '학생 활성화' : '학생 비활성화')
                                : '데이터 삭제'}
                        </h3>
                        <p className="text-sm text-slate-500 mb-6">
                            <span className="font-bold text-slate-700">{deleteTarget.student.name}</span> 학생을<br />
                            {deleteTarget.mode === 'deactivate'
                                ? (deleteTarget.student.is_active === false
                                    ? '활성화하시겠습니까?'
                                    : '비활성화하시겠습니까?\n(이전 자료는 보존됩니다)')
                                : '완전히 삭제하시겠습니까?\n(이전 자료도 모두 삭제됩니다)'}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 py-3 font-bold text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={async () => {
                                    let result;
                                    if (deleteTarget.mode === 'deactivate') {
                                        const newActive = deleteTarget.student.is_active === false ? true : false;
                                        result = await supabase.from('students').update({ is_active: newActive }).eq('id', deleteTarget.student.id);
                                    } else {
                                        result = await supabase.from('students').delete().eq('id', deleteTarget.student.id);
                                    }
                                    if (result.error) {
                                        alert('처리 실패: ' + result.error.message);
                                    } else {
                                        setDeleteTarget(null);
                                        setSelectedStudent(null);
                                        fetchStudents();
                                    }
                                }}
                                className={`flex-1 py-3 text-white rounded-2xl font-bold active:scale-95 transition-all ${deleteTarget.mode === 'deactivate'
                                    ? (deleteTarget.student.is_active === false
                                        ? 'bg-emerald-500 hover:bg-emerald-600'
                                        : 'bg-amber-500 hover:bg-amber-600')
                                    : 'bg-rose-500 hover:bg-rose-600'
                                    }`}
                            >
                                {deleteTarget.mode === 'deactivate'
                                    ? (deleteTarget.student.is_active === false ? '활성화' : '비활성화')
                                    : '삭제하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* 등록 모달 */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 z-50">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] p-5 md:p-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300">
                        {/* 모달 장식 */}
                        <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>

                        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                                <UserPlus size={24} />
                            </div>
                            신규 학생 등록
                        </h2>

                        <form onSubmit={handleAddStudent} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 ml-1">이름</label>
                                <input placeholder="이름을 입력하세요" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border border-transparent focus:border-emerald-500 focus:bg-white outline-none font-bold transition-all text-slate-900" required />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 ml-1">연락처</label>
                                <input placeholder="010-0000-0000" value={studentContact} onChange={e => setStudentContact(formatPhone(e.target.value))} className="w-full p-4 bg-slate-50 rounded-2xl border border-transparent focus:border-emerald-500 focus:bg-white outline-none font-bold transition-all text-slate-900" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 ml-1">학부모 연락처</label>
                                <input placeholder="010-0000-0000" value={contact} onChange={e => setContact(formatPhone(e.target.value))} className="w-full p-4 bg-slate-50 rounded-2xl border border-transparent focus:border-emerald-500 focus:bg-white outline-none font-bold transition-all text-slate-900" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 ml-1">수강료 결제일 (1~31)</label>
                                <input type="number" placeholder="일자만 입력 (예: 15)" value={tuitionDay} onChange={e => setTuitionDay(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border border-transparent focus:border-emerald-500 focus:bg-white outline-none font-bold transition-all text-slate-900" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 ml-1">특이사항 (메모)</label>
                                <textarea placeholder="학생에 대한 간단한 메모를 남겨주세요" value={memo} onChange={e => setMemo(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border border-transparent focus:border-emerald-500 focus:bg-white outline-none font-bold transition-all h-32 text-slate-900" />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => {
                                    setIsModalOpen(false);
                                    resetForm();
                                }} className="flex-1 py-3 font-bold text-slate-400 hover:text-slate-600 transition-colors">취소</button>
                                <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all">등록하기</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <AlertModal
                isOpen={isAlertOpen}
                onClose={() => setIsAlertOpen(false)}
                message={`신규 학생 등록은 관리자(원장님) 계정으로만\n가능합니다.`}
            />
        </div>
    );
}
