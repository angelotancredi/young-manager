'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UserPlus, Phone, Calendar as CalendarIcon, MoreVertical, ArrowLeft, Search, UserCircle } from 'lucide-react';
import Link from 'next/link';
import AlertModal from '@/components/AlertModal';

export default function StudentManagement() {
    const [students, setStudents] = useState<any[]>([]);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .order('name', { ascending: true });

        if (!error) setStudents(data);
    };

    // 유저 권한 정보 불러오기
    const fetchUserRole = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            setUserRole(data?.role || 'teacher');
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
        fetchStudents();
        fetchUserRole();
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
                tuition_day: parseInt(tuitionDay),
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

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                    <div className="relative mb-8 group">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="이름으로 학생 찾기..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold placeholder:text-slate-300"
                        />
                    </div>

                    {/* 학생 리스트 (밀도 있는 레이아웃) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredStudents.map((student) => (
                            <div key={student.id} className="bg-white py-3 px-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-100 transition-all group relative overflow-hidden flex items-center justify-between gap-6">
                                {/* 왼쪽: 이름 + 아이콘 (왼쪽으로 이동) */}
                                <div className="flex-1 flex items-center justify-start ml-2 gap-4">
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-2xl shadow-sm">
                                        <UserCircle size={28} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-800 tracking-tight whitespace-nowrap">{student.name}</h3>
                                </div>

                                {/* 오른쪽: 정보 스택 (연락처가 찌그러지지 않도록 고정 너비와 shrink-0) */}
                                <div className="shrink-0 space-y-2 w-[220px] md:w-[240px]">
                                    {/* 1줄: 학생 연락처 */}
                                    <div className="flex items-center justify-between bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm flex-nowrap">
                                        <div className="flex items-center gap-2 whitespace-nowrap">
                                            <span className="text-xs text-slate-400 font-bold shrink-0">학생</span>
                                            <span className="text-[17px] font-bold text-slate-700 font-mono tracking-tight">{student.student_contact || '-'}</span>
                                        </div>
                                        {student.student_contact && (
                                            <a href={`tel:${student.student_contact}`} className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
                                                <Phone size={12} fill="currentColor" />
                                            </a>
                                        )}
                                    </div>

                                    {/* 2줄: 학부모 연락처 */}
                                    <div className="flex items-center justify-between bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm flex-nowrap">
                                        <div className="flex items-center gap-2 whitespace-nowrap">
                                            <span className="text-xs text-slate-400 font-bold shrink-0">부모</span>
                                            <span className="text-[17px] font-bold text-slate-700 font-mono tracking-tight">{student.parent_contact || '-'}</span>
                                        </div>
                                        {student.parent_contact && (
                                            <a href={`tel:${student.parent_contact}`} className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
                                                <Phone size={12} fill="currentColor" />
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* 옵션 버튼 (절대 위치로 우측 상단 배치) */}
                                <button className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                    <MoreVertical size={16} />
                                </button>
                            </div>
                        ))}

                        {filteredStudents.length === 0 && (
                            <div className="col-span-full py-20 text-center">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-50 rounded-3xl mb-4">
                                    <Search size={24} className="text-slate-300" />
                                </div>
                                <p className="text-slate-400 font-bold">찾으시는 학생이 없습니다.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>


            {/* 등록 모달 */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 z-50">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300">
                        {/* 모달 장식 */}
                        <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>

                        <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
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

                            <div className="flex gap-3 pt-6">
                                <button type="button" onClick={() => {
                                    setIsModalOpen(false);
                                    resetForm();
                                }} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 transition-colors">취소</button>
                                <button type="submit" className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all">등록하기</button>
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
