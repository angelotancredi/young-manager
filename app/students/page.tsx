'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UserPlus, UserMinus, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function StudentsPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [newName, setNewName] = useState('');
    const [loading, setLoading] = useState(true);
    const [issubmitting, setIsSubmitting] = useState(false);

    // 학생 목록 가져오기
    const fetchStudents = async () => {
        setLoading(true);
        const { data } = await supabase.from('students').select('*').order('name');
        if (data) setStudents(data);
        setLoading(false);
    };

    useEffect(() => { fetchStudents(); }, []);

    // 새 학생 등록
    const addStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName) return;
        setIsSubmitting(true);

        const { error } = await supabase.from('students').insert([{ name: newName }]);
        if (error) alert(error.message);
        else {
            setNewName('');
            fetchStudents();
        }
        setIsSubmitting(false);
    };

    return (
        <main className="min-h-screen bg-[#f8fafc] p-8">
            <div className="max-w-2xl mx-auto">
                <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-6 transition">
                    <ArrowLeft size={20} /> <span>달력으로 돌아가기</span>
                </Link>

                <h1 className="text-3xl font-bold text-slate-900 mb-8">학생 명단 관리</h1>

                {/* 학생 추가 폼 */}
                <form onSubmit={addStudent} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-8 flex gap-3">
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="새 학생 이름을 입력하세요"
                        className="flex-1 p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-black font-medium"
                    />
                    <button
                        disabled={issubmitting}
                        className="px-6 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition flex items-center gap-2 shadow-lg shadow-indigo-100"
                    >
                        {issubmitting ? <Loader2 className="animate-spin" /> : <UserPlus size={20} />}
                        <span>등록</span>
                    </button>
                </form>

                {/* 학생 리스트 */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    {loading ? (
                        <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {students.map(s => (
                                <div key={s.id} className="p-5 flex justify-between items-center hover:bg-slate-50/50 transition">
                                    <span className="text-lg font-semibold text-slate-700">{s.name}</span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${s.is_active ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                        {s.is_active ? '수강중' : '퇴원'}
                                    </span>
                                </div>
                            ))}
                            {students.length === 0 && <p className="p-10 text-center text-slate-400 font-medium">등록된 학생이 없습니다.</p>}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}