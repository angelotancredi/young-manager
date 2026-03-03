'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
    format, addMonths, subMonths, startOfMonth, endOfMonth,
    startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import DailySchedule from './DailySchedule';
import AddScheduleModal from './AddScheduleModal';

interface CalendarProps {
    userId?: string;
    userRole?: string | null;
}

export default function Calendar({ userId, userRole }: CalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [schedules, setSchedules] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDailyOpen, setIsDailyOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDateStr, setSelectedDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));

    const holidays = [
        '2025-01-01', '2025-01-28', '2025-01-29', '2025-01-30', '2025-03-01', '2025-03-03',
        '2025-05-05', '2025-05-06', '2025-06-06', '2025-08-15', '2025-10-03', '2025-10-05',
        '2025-10-06', '2025-10-07', '2025-10-08', '2025-10-09', '2025-12-25',
        '2026-01-01', '2026-02-16', '2026-02-17', '2026-02-18', '2026-03-01', '2026-03-02',
        '2026-05-05', '2026-05-24', '2026-05-25', '2026-06-06', '2026-08-15', '2026-08-17',
        '2026-09-24', '2026-09-25', '2026-09-26', '2026-10-03', '2026-10-05', '2026-10-09', '2026-12-25',
        '2027-01-01', '2027-02-06', '2027-02-07', '2027-02-08', '2027-02-09', '2027-03-01',
        '2027-05-05', '2027-05-13', '2027-06-06', '2027-06-07', '2027-08-15', '2027-08-16',
        '2027-09-14', '2027-09-15', '2027-09-16', '2027-10-03', '2027-10-04', '2027-10-09', '2027-10-11', '2027-12-25',
        '2028-01-01', '2028-01-26', '2028-01-27', '2028-01-28', '2028-03-01', '2028-05-02',
        '2028-05-05', '2028-06-06', '2028-08-15', '2028-10-02', '2028-10-03', '2028-10-04',
        '2028-10-05', '2028-10-09', '2028-12-25',
        '2029-01-01', '2029-02-12', '2029-02-13', '2029-02-14', '2029-03-01', '2029-05-05',
        '2029-05-07', '2029-05-20', '2029-05-21', '2029-06-06', '2029-08-15', '2029-09-21',
        '2029-09-22', '2029-09-23', '2029-09-24', '2029-10-03', '2029-10-09', '2029-12-25',
        '2030-01-01', '2030-02-02', '2030-02-03', '2030-02-04', '2030-03-01', '2030-05-05',
        '2030-05-06', '2030-05-09', '2030-06-06', '2030-08-15', '2030-09-11', '2030-09-12',
        '2030-09-13', '2030-10-03', '2030-10-09', '2030-12-25'
    ];

    const fetchSchedules = useCallback(async () => {
        if (!userId || !userRole) return;

        setIsLoading(true);

        // 1. 기본 쿼리 시작
        let query = supabase
            .from('schedules')
            .select(`*, students (name), profiles (name)`)
            .eq('status', 'confirmed')
            .order('time', { ascending: true });

        // 2. 선생님(teacher)이라면 본인 수업만 필터링
        if (userRole === 'teacher') {
            query = query.eq('teacher_id', userId);
        }

        const { data, error } = await query;
        if (!error && data) setSchedules(data);
        setIsLoading(false);
    }, [userId, userRole]);

    useEffect(() => {
        fetchSchedules();
    }, [currentMonth, userId, userRole]);

    const handleDateClick = (date: Date) => {
        setSelectedDateStr(format(date, 'yyyy-MM-dd'));
        setIsDailyOpen(true);
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const rows = [];
        let days = [];
        let day = startDate;

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                const cloneDay = day;
                const dateKey = format(cloneDay, 'yyyy-MM-dd');
                const daySchedules = schedules.filter(s => s.date === dateKey);
                const isHoliday = holidays.includes(dateKey);
                const dayOfWeek = day.getDay();
                const isSelected = isSameDay(day, new Date(selectedDateStr));
                const isToday = isSameDay(day, new Date());

                days.push(
                    <div
                        key={day.toString()}
                        onClick={() => handleDateClick(cloneDay)}
                        className={`min-h-[90px] flex flex-col items-start p-1.5 border-b border-slate-50 cursor-pointer transition-all relative
              ${isSelected ? 'bg-indigo-50/30' : ''} active:bg-slate-100
              ${!isSameMonth(day, monthStart) ? 'text-gray-400' : ''}`}
                    >
                        <div className="flex items-center gap-1 w-full mb-0.5">
                            <span className={`text-[12px] 
                                ${!isSameMonth(day, monthStart) ? 'text-slate-200' :
                                    (dayOfWeek === 0 || isHoliday) ? 'text-red-500' :
                                        dayOfWeek === 6 ? 'text-blue-500' : 'text-black'}
                                ${isToday ? 'bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center' : ''}
                            `}>
                                {format(cloneDay, 'd')}
                            </span>
                            {daySchedules.length > 0 && (
                                <div className="w-1 h-1 bg-indigo-400 rounded-full" />
                            )}
                        </div>

                        <div className="flex flex-col gap-0.5 w-full">
                            {daySchedules.slice(0, 3).map((schedule, idx) => (
                                <div key={idx} className="text-[9px] text-black truncate leading-tight pl-px pr-1 bg-white/70 rounded-sm">
                                    {schedule.students?.name} ({schedule.time.substring(0, 5)})
                                </div>
                            ))}
                            {daySchedules.length > 3 && (
                                <div className="text-[9px] text-slate-300 ml-0.5">...</div>
                            )}
                        </div>

                        {isSelected && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 rounded-t-full mx-1" />
                        )}
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(<div className="grid grid-cols-7" key={day.toString()}>{days}</div>);
            days = [];
        }
        return <div className="border-t border-slate-50">{rows}</div>;
    };

    if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-indigo-600" /></div>;

    return (
        <div className="bg-white relative">
            <div className="p-3 pb-0.5">
                <div className="flex items-center justify-between mb-2 px-1 mt-0.5">
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                        {format(currentMonth, 'yyyy년 M월', { locale: ko })}
                    </h2>
                    <div className="flex gap-1.5">
                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 bg-slate-50 rounded-lg active:scale-90 transition">
                            <ChevronLeft size={16} />
                        </button>
                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 bg-slate-50 rounded-lg active:scale-90 transition">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 mb-1 border-b border-slate-50 pb-1.5 text-center text-[12px]">
                    <div className="text-red-500">일</div>
                    <div className="text-black">월</div>
                    <div className="text-black">화</div>
                    <div className="text-black">수</div>
                    <div className="text-black">목</div>
                    <div className="text-black">금</div>
                    <div className="text-blue-500">토</div>
                </div>

                {renderCells()}
            </div>

            <DailySchedule
                isOpen={isDailyOpen}
                onClose={() => setIsDailyOpen(false)}
                date={selectedDateStr}
                schedules={schedules.filter(s => s.date === selectedDateStr)}
                userId={userId}
                userRole={userRole}
                onAdd={() => {
                    setIsDailyOpen(false);
                    setIsModalOpen(true);
                }}
                onRefresh={fetchSchedules}
            />

            <AddScheduleModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                selectedDate={selectedDateStr}
                userId={userId}
                userRole={userRole}
                onSave={fetchSchedules}
            />
        </div>
    );
}