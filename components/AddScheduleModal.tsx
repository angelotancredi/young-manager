'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Loader2, Calendar as CalendarIcon, Clock, User } from 'lucide-react';

export default function AddScheduleModal({ isOpen, onClose, selectedDate, onSave, userId, userRole }: any) {
    const [students, setStudents] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [studentId, setStudentId] = useState('');
    const [teacherId, setTeacherId] = useState(userId || '');

    // 시간/분 분리 선택
    const [hour, setHour] = useState('14');
    const [minute, setMinute] = useState('00');
    const [isMakeup, setIsMakeup] = useState(false);
    const [loading, setLoading] = useState(false);

    // 시간 옵션 (09시~22시)
    const hours = Array.from({ length: 14 }, (_, i) => String(i + 9).padStart(2, '0'));
    // 분 옵션 (10분 단위)
    const minutes = ['00', '10', '20', '30', '40', '50'];

    useEffect(() => {
        if (isOpen) {
            if (userRole === 'teacher' && userId) {
                setTeacherId(userId);
            }
            const fetchData = async () => {
                const { data: st } = await supabase.from('students').select('*').eq('is_active', true);
                const { data: tc } = await supabase.from('profiles').select('*');
                if (st) setStudents(st);
                if (tc) setTeachers(tc);
            };
            fetchData();
        }
    }, [isOpen, userId, userRole]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.from('schedules').insert([
            {
                date: selectedDate,
                time: `${hour}:${minute}:00`,
                student_id: studentId,
                teacher_id: teacherId,
                is_makeup: isMakeup,
                status: 'confirmed'
            }
        ]);

        if (error) {
            alert('저장 실패: ' + error.message);
        } else {
            onSave();
            onClose();
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
            <div className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">

                {/* 상단 디자인 헤더 */}
                <div className="bg-emerald-600 p-6 text-white relative">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition">
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-3 mb-1">
                        <CalendarIcon size={20} className="text-emerald-200" />
                        <span className="text-emerald-100 font-medium">{selectedDate}</span>
                    </div>
                    <h2 className="text-2xl font-bold">새 수업 등록</h2>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">

                    {/* 학생 선택 */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                            <User size={16} className="text-emerald-500" /> 대상 학생
                        </label>
                        <select
                            value={studentId}
                            onChange={(e) => setStudentId(e.target.value)}
                            required
                            className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-800 font-medium appearance-none"
                            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em' }}
                        >
                            <option value="">학생을 선택하세요</option>
                            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    {/* 선생님 선택 */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                            <User size={16} className="text-emerald-500" /> 담당 선생님
                        </label>
                        <select
                            value={teacherId}
                            onChange={(e) => setTeacherId(e.target.value)}
                            required
                            disabled={userRole === 'teacher'}
                            className={`w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-800 font-medium appearance-none ${userRole === 'teacher' ? 'opacity-70 cursor-not-allowed' : ''}`}
                            style={{ backgroundImage: userRole === 'teacher' ? 'none' : 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em' }}
                        >
                            {userRole !== 'teacher' && <option value="">선생님을 선택하세요</option>}
                            {teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.role === 'admin' ? '원장' : '교사'})</option>)}
                        </select>
                    </div>

                    {/* 시간 선택 (10분 단위 커스텀) */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                            <Clock size={16} className="text-emerald-500" /> 수업 시간
                        </label>
                        <div className="flex gap-3 items-center">
                            <select
                                value={hour}
                                onChange={(e) => setHour(e.target.value)}
                                className="flex-1 p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 text-center font-bold text-lg"
                            >
                                {hours.map(h => <option key={h} value={h}>{h}시</option>)}
                            </select>
                            <span className="font-bold text-slate-400">:</span>
                            <select
                                value={minute}
                                onChange={(e) => setMinute(e.target.value)}
                                className="flex-1 p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 text-center font-bold text-lg"
                            >
                                {minutes.map(m => <option key={m} value={m}>{m}분</option>)}
                            </select>
                        </div>
                    </div>

                    {/* 보강 수업 체크박스 */}
                    <div className="flex items-center gap-3 p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                        <label className="flex items-center gap-3 cursor-pointer select-none w-full">
                            <input
                                type="checkbox"
                                checked={isMakeup}
                                onChange={(e) => setIsMakeup(e.target.checked)}
                                className="w-5 h-5 rounded-md border-amber-300 text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                                <span className="font-bold text-slate-700 text-sm">보강 수업인가요?</span>
                                <p className="text-[10px] text-slate-400">보강 수업으로 등록됩니다</p>
                            </div>
                        </label>
                    </div>

                    {/* 하단 버튼 */}
                    <button
                        disabled={loading}
                        className="w-full py-5 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all active:scale-[0.98] flex justify-center items-center text-lg"
                    >
                        {loading ? <Loader2 className="animate-spin mr-2" /> : '수업 확정하기'}
                    </button>
                </form>
            </div>
        </div>
    );
}