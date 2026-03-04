'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, TrendingUp, AlertCircle, Calendar } from 'lucide-react';

interface StudentStatsProps {
    studentId: string;
    studentName: string;
}

interface AttendanceRecord {
    id: string;
    lesson_date: string;
    status: string;
    teacher_id: string;
    teacher_name?: string;
}

export default function StudentStats({ studentId, studentName }: StudentStatsProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [stats, setStats] = useState({
        total: 0,
        present: 0,
        absent: 0,
        makeup: 0,
        attendanceRate: 0
    });

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            try {
                const { data: attendanceData, error: attendanceError } = await supabase
                    .from('attendance')
                    .select('*')
                    .eq('student_id', studentId)
                    .order('lesson_date', { ascending: false });

                if (attendanceError) throw attendanceError;

                if (attendanceData && attendanceData.length > 0) {
                    const teacherIds = [...new Set(attendanceData.map(r => r.teacher_id).filter(Boolean))];
                    let teachersMap: Record<string, string> = {};

                    if (teacherIds.length > 0) {
                        const { data: profiles, error: profilesError } = await supabase
                            .from('profiles')
                            .select('id, full_name')
                            .in('id', teacherIds);

                        if (!profilesError && profiles) {
                            profiles.forEach(p => {
                                teachersMap[p.id] = p.full_name;
                            });
                        }
                    }

                    let total = attendanceData.length;
                    let presentCount = 0;
                    let absentCount = 0;
                    let makeupCount = 0;

                    const enrichedRecords = attendanceData.map(record => {
                        // 지각도 출석에 포함
                        if (record.status === 'present' || record.status === 'late') presentCount++;
                        else if (record.status === 'absent') absentCount++;
                        else if (record.status === 'makeup') makeupCount++;

                        return {
                            ...record,
                            status: record.status === 'late' ? 'present' : record.status,
                            teacher_name: record.teacher_id ? (teachersMap[record.teacher_id] || '미상 교사') : '시스템'
                        };
                    });

                    // 출석 관련 항목 (순수 출석, 보강)을 모두 '참석'으로 간주
                    const attended = presentCount + makeupCount;
                    const rate = total > 0 ? Math.round((attended / total) * 100) : 0;

                    setStats({
                        total,
                        present: presentCount,
                        absent: absentCount,
                        makeup: makeupCount,
                        attendanceRate: rate
                    });
                    setRecords(enrichedRecords);
                }
            } catch (err) {
                console.error("Failed to fetch stats", err);
            } finally {
                setIsLoading(false);
            }
        };

        if (studentId) fetchStats();
    }, [studentId]);

    const getStatusText = (status: string) => {
        switch (status) {
            case 'present': return <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-bold">출석</span>;
            case 'absent': return <span className="text-rose-500 bg-rose-50 px-2 py-0.5 rounded text-[11px] font-bold">결석</span>;
            case 'makeup': return <span className="text-blue-500 bg-blue-50 px-2 py-0.5 rounded text-[11px] font-bold">보강</span>;
            default: return <span className="text-slate-500 bg-slate-50 px-2 py-0.5 rounded text-[11px] font-bold">알수없음</span>;
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full p-20">
                <Loader2 className="animate-spin text-emerald-500" size={32} />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full space-y-3 overflow-hidden">
            <div className="shrink-0 space-y-3">
                <div className="bg-slate-50 rounded-2xl p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mt-10 -mr-10"></div>
                    <div className="relative z-10">
                        <h4 className="text-slate-500 font-bold text-xs mb-1">전체 누적 출석률</h4>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-black text-slate-800">{stats.attendanceRate}%</span>
                            <span className="text-sm font-medium text-slate-400 mb-1.5 border-l border-slate-300 pl-2">총 {stats.total}회 수업</span>
                        </div>
                        {stats.total > 0 && stats.attendanceRate >= 90 ? (
                            <p className="text-xs text-emerald-600 font-bold mt-2 flex items-center gap-1">
                                <TrendingUp size={14} /> 아주 우수한 출석률입니다!
                            </p>
                        ) : stats.total > 0 && stats.attendanceRate < 70 ? (
                            <p className="text-xs text-amber-500 font-bold mt-2 flex items-center gap-1">
                                <AlertCircle size={14} /> 출석 관리가 필요합니다.
                            </p>
                        ) : null}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white border border-slate-100 rounded-2xl py-2.5 px-4 shadow-sm flex flex-col items-center justify-center gap-1">
                        <p className="text-xs font-medium text-slate-400">출석</p>
                        <p className="text-xl font-bold text-emerald-600">{stats.present}</p>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-2xl py-2.5 px-4 shadow-sm flex flex-col items-center justify-center gap-1">
                        <p className="text-xs font-medium text-slate-400">결석</p>
                        <p className="text-xl font-bold text-rose-500">{stats.absent}</p>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-2xl py-2.5 px-4 shadow-sm flex flex-col items-center justify-center gap-1">
                        <p className="text-xs font-medium text-slate-400">보강</p>
                        <p className="text-xl font-bold text-blue-500">{stats.makeup}</p>
                    </div>
                </div>

                {records.length > 0 && (
                    <h4 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2 mt-2">
                        <Calendar size={16} className="text-emerald-500" />
                        상세 출결 기록
                    </h4>
                )}
            </div>

            {records.length > 0 ? (
                <div className="flex-1 overflow-y-auto pr-0.5 custom-scrollbar">
                    <div className="space-y-1.5 pb-4">
                        {records.map((record) => (
                            <div key={record.id} className="flex flex-row items-center justify-between py-1.5 px-3 bg-white border border-slate-100 rounded-xl hover:border-emerald-100 transition-colors">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-[13px] font-bold text-slate-700">{record.lesson_date}</p>
                                        <p className="text-[10px] font-medium text-slate-400 mt-[1px]">{record.teacher_name} 선생님</p>
                                    </div>
                                </div>
                                <div>
                                    {getStatusText(record.status)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-8 shrink-0">
                    <p className="text-slate-400 font-medium text-sm">아직 {studentName} 학생의 출결 기록이 없습니다.</p>
                </div>
            )}
        </div>
    );
}
