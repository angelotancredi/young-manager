'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UserPlus, Phone, Calendar as CalendarIcon, MoreVertical, ArrowLeft, Search, UserCircle } from 'lucide-react';
import Link from 'next/link';

export default function StudentManagement() {
    const [students, setStudents] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // 입력 폼 상태
    const [name, setName] = useState('');
    const [contact, setContact] = useState('');
    const [tuitionDay, setTuitionDay] = useState('');
    const [memo, setMemo] = useState('');

    // 학생 목록 불러오기
    const fetchStudents = async () => {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .order('name', { ascending: true });

        if (!error) setStudents(data);
    };

    useEffect(() => { fetchStudents(); }, []);

    // 학생 등록 함수
    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('students').insert([
            {
                name,
                parent_contact: contact,
                tuition_day: parseInt(tuitionDay),
                memo,
                teacher_id: user?.id
            }
        ]);

        if (!error) {
            setIsModalOpen(false);
            setName(''); setContact(''); setTuitionDay(''); setMemo('');
            fetchStudents();
        }
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900">
            <div className="max-w-5xl mx-auto px-6 py-10 md:py-16">
                {/* 상단 네비게이션 & 타이틀 */}
                <div className="flex flex-col gap-6 mb-10">
                    <Link href="/" className="group flex items-center gap-2 text-slate-400 hover:text-emerald-600 font-bold transition-all w-fit text-sm">
                        <div className="p-1.5 bg-white border border-slate-100 rounded-lg shadow-sm group-hover:border-emerald-100 group-hover:bg-emerald-50/50 transition-all">
                            <ArrowLeft size={16} />
                        </div>
                        달력으로 돌아가기
                    </Link>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h1 className="text-4xl font-black tracking-tight text-slate-900 italic">
                                Student <span className="text-emerald-600">List</span>
                            </h1>
                            <p className="text-slate-500 font-semibold mt-1.5 flex items-center gap-1.5">
                                <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                우리 학원의 소중한 보물들 ({students.length}명)
                            </p>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all"
                        >
                            <UserPlus size={18} />
                            신규 학생 등록
                        </button>
                    </div>
                </div>

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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredStudents.map((student) => (
                        <div key={student.id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-100 transition-all group relative overflow-hidden">
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 font-black text-lg shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                    {student.name[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-black text-slate-800 truncate">{student.name}</h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                                            <Phone size={10} className="text-slate-300" />
                                            {student.parent_contact || '연락처 없음'}
                                        </div>
                                    </div>
                                </div>
                                <button className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
                                    <MoreVertical size={16} />
                                </button>
                            </div>

                            <div className="mt-3 flex items-center gap-2">
                                <div className="flex items-center gap-1 text-[11px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-100/50">
                                    <CalendarIcon size={10} />
                                    결제일: 매달 {student.tuition_day}일
                                </div>
                                {student.memo && (
                                    <div className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg truncate flex-1">
                                        📝 {student.memo}
                                    </div>
                                )}
                            </div>
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

            {/* 등록 모달 */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 z-50">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300">
                        {/* 모달 장식 */}
                        <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>

                        <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                                <UserPlus size={24} />
                            </div>
                            신규 학생 등록
                        </h2>

                        <form onSubmit={handleAddStudent} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-400 ml-1">학생 이름</label>
                                <input placeholder="이름을 입력하세요" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border border-transparent focus:border-emerald-500 focus:bg-white outline-none font-bold transition-all text-slate-900" required />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-400 ml-1">학부모 연락처</label>
                                <input placeholder="010-0000-0000" value={contact} onChange={e => setContact(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border border-transparent focus:border-emerald-500 focus:bg-white outline-none font-bold transition-all text-slate-900" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-400 ml-1">수강료 결제일 (1~31)</label>
                                <input type="number" placeholder="일자만 입력 (예: 15)" value={tuitionDay} onChange={e => setTuitionDay(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border border-transparent focus:border-emerald-500 focus:bg-white outline-none font-bold transition-all text-slate-900" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-400 ml-1">특이사항 (메모)</label>
                                <textarea placeholder="학생에 대한 간단한 메모를 남겨주세요" value={memo} onChange={e => setMemo(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border border-transparent focus:border-emerald-500 focus:bg-white outline-none font-bold transition-all h-32 text-slate-900" />
                            </div>

                            <div className="flex gap-3 pt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 transition-colors">취소</button>
                                <button type="submit" className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all">등록하기</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
