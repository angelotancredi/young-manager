'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UserPlus, Search, Phone, Calendar as CalendarIcon, MoreVertical } from 'lucide-react';

export default function StudentManagement() {
    const [students, setStudents] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // 입력 폼 상태
    const [name, setName] = useState('');
    const [contact, setContact] = useState('');
    const [tuitionDay, setTuitionDay] = useState('');
    const [memo, setMemo] = useState('');

    // 학생 목록 불러오기
    const fetchStudents = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 원장님은 전체, 선생님은 자기 학생만 (권한 로직은 나중에 더 정교화 가능)
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

    return (
        <div className="min-h-screen bg-[#f8fafc] p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Student List</h1>
                        <p className="text-slate-400 font-bold mt-1">우리 학원 보물들 명단입니다. ✨</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
                    >
                        <UserPlus size={20} />
                        신규 학생 등록
                    </button>
                </div>

                {/* 학생 카드 리스트 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {students.map((student) => (
                        <div key={student.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xl">
                                    {student.name[0]}
                                </div>
                                <button className="text-slate-300 hover:text-slate-600"><MoreVertical size={20} /></button>
                            </div>
                            <h3 className="text-xl font-black text-slate-800 mb-1">{student.name}</h3>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                                    <Phone size={14} /> {student.parent_contact || '연락처 없음'}
                                </div>
                                <div className="flex items-center gap-2 text-sm font-bold text-indigo-500 bg-indigo-50 w-fit px-3 py-1 rounded-lg">
                                    <CalendarIcon size={14} /> 결제일: 매달 {student.tuition_day}일
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 등록 모달 (생략 가능하지만 간단히 구현) */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl">
                        <h2 className="text-2xl font-black mb-6">신규 학생 등록</h2>
                        <form onSubmit={handleAddStudent} className="space-y-4">
                            <input placeholder="학생 이름" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" required />
                            <input placeholder="학부모 연락처" value={contact} onChange={e => setContact(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" />
                            <input type="number" placeholder="수강료 결제일 (1~31)" value={tuitionDay} onChange={e => setTuitionDay(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" />
                            <textarea placeholder="특이사항" value={memo} onChange={e => setMemo(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold h-32" />
                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-black text-slate-400">취소</button>
                                <button type="submit" className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black">등록하기</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}