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
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [dragStart, setDragStart] = useState<number | null>(null);

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

    const fetchSchedules = useCallback(async (showLoader = false) => {
        // 💡 userId와 userRole이 모두 확정되어야만 데이터 요청
        if (!userId || userRole === null || userRole === undefined) {
            setIsLoading(false);
            return;
        }

        // 💡 첫 로딩 시에만 스피너 표시, onRefresh 등 갱신 시에는 백그라운드 처리
        if (showLoader) setIsLoading(true);

        try {
            let query = supabase
                .from('schedules')
                .select(`*, students (name), profiles (full_name)`)
                .eq('status', 'confirmed')
                .order('time', { ascending: true });

            if (userRole === 'teacher') {
                query = query.eq('teacher_id', userId);
            }

            const { data, error } = await query;

            if (error) {
                console.error("Fetch schedules error:", error);
                setSchedules([]);
            } else {
                setSchedules(data || []);
            }
        } catch (err) {
            console.error("Calendar fetch error:", err);
            setSchedules([]);
        } finally {
            setIsLoading(false);
        }
    }, [userId, userRole]);

    useEffect(() => {
        fetchSchedules(true);
    }, [currentMonth, fetchSchedules]);

    // Supabase Realtime: schedules 변경 감지 → 달력 자동 갱신
    useEffect(() => {
        const channel = supabase
            .channel('calendar-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, () => {
                fetchSchedules();
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchSchedules]);

    const handleDateClick = (date: Date) => {
        setSelectedDateStr(format(date, 'yyyy-MM-dd'));
        setIsDailyOpen(true);
    };

    // --- 드래그/스와이프 월 이동 로직 ---
    const SWIPE_THRESHOLD = 50;

    const onSwipeLeft = () => setCurrentMonth(addMonths(currentMonth, 1));
    const onSwipeRight = () => setCurrentMonth(subMonths(currentMonth, 1));

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart) return;
        const touchEnd = e.changedTouches[0].clientX;
        const diff = touchStart - touchEnd;

        if (diff > SWIPE_THRESHOLD) onSwipeLeft();
        if (diff < -SWIPE_THRESHOLD) onSwipeRight();
        setTouchStart(null);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setDragStart(e.clientX);
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (!dragStart) return;
        const dragEnd = e.clientX;
        const diff = dragStart - dragEnd;

        if (diff > SWIPE_THRESHOLD) onSwipeLeft();
        if (diff < -SWIPE_THRESHOLD) onSwipeRight();
        setDragStart(null);
    };
    // ---------------------------------

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
                        className={`min-h-[90px] flex flex-col items-start p-1.5 border-b border-slate-100 cursor-pointer transition-all relative
              ${isSelected ? 'bg-emerald-50/30' : ''} active:bg-slate-100
              ${!isSameMonth(day, monthStart) ? 'text-gray-400' : ''}`}
                    >
                        <div className="flex items-center gap-1 w-full mb-0.5">
                            <span className={`text-[12px] 
                                ${!isSameMonth(day, monthStart) ? 'text-slate-200' :
                                    (dayOfWeek === 0 || isHoliday) ? 'text-red-500' :
                                        dayOfWeek === 6 ? 'text-blue-500' : 'text-black'}
                                ${isToday ? 'bg-emerald-600 text-white rounded-full w-5 h-5 flex items-center justify-center' : ''}
                            `}>
                                {format(cloneDay, 'd')}
                            </span>
                            {daySchedules.length > 0 && (
                                <div className="w-1 h-1 bg-emerald-400 rounded-full" />
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
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-full mx-1" />
                        )}
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(<div className="grid grid-cols-7" key={day.toString()}>{days}</div>);
            days = [];
        }
        return <div className="border-t border-slate-100">{rows}</div>;
    };

    if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-emerald-600" /></div>;

    return (
        <div className="bg-white relative">
            <div className="pt-3 px-1.5 pb-0.5">
                <div className="relative flex items-center justify-center mb-2 px-1 mt-0.5">
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                        {format(currentMonth, 'yyyy년 M월', { locale: ko })}
                    </h2>
                    <div className="absolute right-1 flex gap-1.5">
                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 bg-slate-50 rounded-lg active:scale-90 transition">
                            <ChevronLeft size={16} />
                        </button>
                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 bg-slate-50 rounded-lg active:scale-90 transition">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 mb-1 border-b border-slate-100 pb-1.5 text-center text-[12px]">
                    <div className="text-red-500">일</div>
                    <div className="text-black">월</div>
                    <div className="text-black">화</div>
                    <div className="text-black">수</div>
                    <div className="text-black">목</div>
                    <div className="text-black">금</div>
                    <div className="text-blue-500">토</div>
                </div>

                <div
                    className="max-h-[460px] overflow-y-auto select-none touch-pan-y"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                >
                    {renderCells()}
                </div>
            </div>

            <DailySchedule
                isOpen={isDailyOpen}
                onClose={() => setIsDailyOpen(false)}
                date={selectedDateStr}
                schedules={schedules.filter(s => s.date === selectedDateStr)}
                userId={userId}
                userRole={userRole}
                onAdd={() => {
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