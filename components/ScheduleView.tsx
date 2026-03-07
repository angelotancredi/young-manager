'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
    format, startOfWeek, addDays, startOfDay, addHours,
    isSameDay, parseISO, eachDayOfInterval, endOfWeek
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Loader2, Clock, X, User, Calendar, Watch, BookOpen } from 'lucide-react';
import AddScheduleModal from './AddScheduleModal';

interface ScheduleViewProps {
    userId: string;
    userRole: string | null;
}

// 기본 파스텔 컬러 리스트 (DB에 색상이 없을 때 사용)
const DEFAULT_PASTEL_COLORS = [
    '#F0FDF4', // Emerald 50
    '#EFF6FF', // Blue 50
    '#F5F3FF', // Violet 50
    '#FAF5FF', // Purple 50
    '#FDF2F8', // Pink 50
    '#FFF1F2', // Rose 50
    '#FFF7ED', // Orange 50
    '#FEFCE8', // Yellow 50
];

// Tailwind 색상 유틸리티: 배경색에 따른 텍스트/테두리 색상 결정
const getContrastStyles = (hexColor: string | null) => {
    if (!hexColor) return 'bg-slate-50 border-slate-200 text-slate-700';

    // 간단한 매핑 (대부분 파스텔 톤이므로 테두리와 텍스트 색상을 어둡게 지정)
    // 좀 더 정교하게 하려면 hex to hsl 변환이 필요하지만, 여기서는 직관적인 매핑 사용
    // 신규 컬러 매핑 (100 단계 파스텔)
    const mapping: { [key: string]: string } = {
        '#DCFCE7': 'border-emerald-200 text-emerald-700',
        '#DBEAFE': 'border-blue-200 text-blue-700',
        '#EDE9FE': 'border-violet-200 text-violet-700',
        '#F3E8FF': 'border-purple-200 text-purple-700',
        '#FCE7F3': 'border-pink-200 text-pink-700',
        '#FFE4E6': 'border-rose-200 text-rose-700',
        '#FFEDD5': 'border-orange-200 text-orange-700',
        '#FEF9C3': 'border-yellow-200 text-yellow-700',
        '#D1FAE5': 'border-teal-200 text-teal-700',
        '#CFFAFE': 'border-cyan-200 text-cyan-700',
        '#F1F5F9': 'border-slate-200 text-slate-700',
        '#F5F5F4': 'border-stone-200 text-stone-700',
        '#FEF3C7': 'border-amber-200 text-amber-700',
        '#E0F2FE': 'border-sky-200 text-sky-700',
        '#E0E7FF': 'border-indigo-200 text-indigo-700',
        '#FAE8FF': 'border-fuchsia-200 text-fuchsia-700',
        '#CCFBF1': 'border-teal-200 text-teal-700',
        '#FEE2E2': 'border-red-200 text-red-700',
        '#FDF4FF': 'border-fuchsia-100 text-fuchsia-600',
    };

    return mapping[hexColor] || 'border-slate-200 text-slate-700';
};

export default function ScheduleView({ userId, userRole }: ScheduleViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [schedules, setSchedules] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [dragStart, setDragStart] = useState<number | null>(null);
    const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedAddDate, setSelectedAddDate] = useState<string>('');
    const [selectedAddHour, setSelectedAddHour] = useState<string>('');


    // 시간 범위: 09:00 ~ 22:00
    const hours = Array.from({ length: 14 }, (_, i) => i + 9);

    // 주간 날짜 배열 (월~토, 일요일 제외)
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // 월요일 시작
    const weekDays = eachDayOfInterval({
        start: weekStart,
        end: addDays(weekStart, 5) // 토요일까지 (6일)
    });


    const fetchSchedules = useCallback(async () => {
        setIsLoading(true);
        try {
            const startDate = format(weekDays[0], 'yyyy-MM-dd');
            const endDate = format(weekDays[5], 'yyyy-MM-dd');

            let query = supabase
                .from('schedules')
                .select(`*, students (name), profiles (full_name, color)`)
                .eq('status', 'confirmed')
                .gte('date', startDate)
                .lte('date', endDate);

            if (userRole === 'teacher') {
                query = query.eq('teacher_id', userId);
            }

            const { data, error } = await query;
            if (error) throw error;
            setSchedules(data || []);
        } catch (err) {
            console.error('Error fetching schedules:', err);
        } finally {
            setIsLoading(false);
        }
    }, [weekDays, userId, userRole]);

    useEffect(() => {
        fetchSchedules();
    }, [currentDate]);

    const handlePrevWeek = () => setCurrentDate(addDays(currentDate, -7));
    const handleNextWeek = () => setCurrentDate(addDays(currentDate, 7));
    const handleToday = () => setCurrentDate(new Date());

    // --- 드래그/스와이프 주 이동 로직 ---
    const SWIPE_THRESHOLD = 50;

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart) return;
        const touchEnd = e.changedTouches[0].clientX;
        const diff = touchStart - touchEnd;

        if (diff > SWIPE_THRESHOLD) handleNextWeek();
        if (diff < -SWIPE_THRESHOLD) handlePrevWeek();
        setTouchStart(null);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setDragStart(e.clientX);
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (!dragStart) return;
        const dragEnd = e.clientX;
        const diff = dragStart - dragEnd;

        if (diff > SWIPE_THRESHOLD) handleNextWeek();
        if (diff < -SWIPE_THRESHOLD) handlePrevWeek();
        setDragStart(null);
    };
    // ---------------------------------

    if (isLoading && schedules.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
                <Loader2 className="animate-spin text-emerald-600" size={40} />
                <p className="text-slate-500 font-medium font-sans">스케줄을 불러오는 중입니다...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden font-sans text-black">
            {/* 상단 컨트롤러 */}
            <div className="p-4 md:p-6 border-b border-slate-100 flex flex-row justify-start items-center gap-3 md:gap-6 bg-slate-50/30">
                <div className="flex flex-row items-center justify-between w-full">
                    <h2 className="text-lg md:text-2xl font-bold text-slate-900 tracking-tight whitespace-nowrap">
                        {format(weekDays[0], 'yyyy.MM.dd')}. ~ {format(weekDays[5], 'MM.dd')}.
                    </h2>

                    <div className="flex items-center gap-1.5 shrink-0 h-8 md:h-10">
                        <button onClick={handlePrevWeek} title="이전 주" className="flex items-center justify-center px-2 md:px-6 h-full bg-white border border-slate-200 rounded-lg md:rounded-xl hover:bg-slate-50 transition-all active:scale-90 shadow-sm">
                            <ChevronLeft size={16} className="text-slate-600" />
                        </button>
                        <button
                            onClick={handleToday}
                            className="flex items-center justify-center px-2 md:px-4 h-full bg-white border border-slate-200 rounded-lg md:rounded-xl text-[11px] md:text-sm font-bold text-slate-600 hover:bg-slate-50 font-sans transition-all active:scale-95 shadow-sm"
                        >
                            오늘
                        </button>
                        <button onClick={handleNextWeek} title="다음 주" className="flex items-center justify-center px-2 md:px-6 h-full bg-white border border-slate-200 rounded-lg md:rounded-xl hover:bg-slate-50 transition-all active:scale-90 shadow-sm">
                            <ChevronRight size={16} className="text-slate-600" />
                        </button>
                    </div>
                </div>
            </div>

            {/* 시간표 본체 */}
            <div
                className="flex-1 overflow-y-auto scrollbar-hide min-h-0 select-none touch-pan-y"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
            >
                <div className="flex flex-col">
                    {/* 요일 헤더 */}
                    <div className="grid grid-cols-[2.5rem_repeat(6,minmax(0,1fr))] md:grid-cols-[3.5rem_repeat(6,minmax(0,1fr))] border-b border-slate-100 bg-slate-50/50 sticky top-0 z-20 font-sans shadow-sm">
                        <div className="border-r border-slate-100 bg-slate-50/50 flex items-center justify-center">
                            <Clock size={16} className="text-emerald-500 hidden md:block" />
                        </div>
                        {weekDays.map((day, i) => (
                            <div key={i} className={`p-1.5 md:p-3 text-center border-r border-slate-100 last:border-r-0 ${isSameDay(day, new Date()) ? 'bg-emerald-50/30' : ''}`}>
                                <div className="flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 whitespace-nowrap">
                                    <span className={`text-[15px] md:text-lg font-extrabold ${isSameDay(day, new Date()) ? 'text-emerald-600' : 'text-slate-900'}`}>
                                        {format(day, 'd')}
                                    </span>
                                    <span className={`text-[11px] md:text-[17px] font-extrabold ${isSameDay(day, new Date()) ? 'text-emerald-600' : day.getDay() === 0 ? 'text-red-500' : day.getDay() === 6 ? 'text-blue-500' : 'text-slate-500'}`}>
                                        {format(day, 'EEEE', { locale: ko }).replace('요일', '')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 시간표 본체 그리드 (행 중심) */}
                    <div className="flex flex-col">
                        {hours.map(hour => (
                            <div key={hour} className="grid grid-cols-[2.5rem_repeat(6,minmax(0,1fr))] md:grid-cols-[3.5rem_repeat(6,minmax(0,1fr))] h-auto min-h-[72px] md:min-h-[96px] border-b border-slate-200">
                                {/* 시간 열 */}
                                <div className="border-r border-slate-100 bg-slate-50/30 flex items-start justify-center pt-2 md:pt-3 text-[14px] md:text-base font-bold text-slate-800">
                                    {hour.toString().padStart(2, '0')}
                                </div>

                                {/* 요일별 데이터 셀 */}
                                {weekDays.map((day, dayIndex) => {
                                    const dateStr = format(day, 'yyyy-MM-dd');
                                    const slotSchedules = schedules
                                        .filter(s => s.date === dateStr && parseInt(s.time.split(':')[0]) === hour)
                                        .sort((a, b) => a.time.localeCompare(b.time));

                                    return (
                                        <div
                                            key={dayIndex}
                                            className={`border-r border-slate-100 last:border-r-0 p-0.5 md:p-1 flex flex-col gap-1 transition-colors hover:bg-slate-50/50 cursor-pointer min-w-0 ${isSameDay(day, new Date()) ? 'bg-emerald-50/10' : ''}`}
                                            onClick={() => {
                                                if (userRole === 'admin' || userRole === 'owner') {
                                                    setSelectedAddDate(dateStr);
                                                    setSelectedAddHour(hour.toString().padStart(2, '0'));
                                                    setIsAddModalOpen(true);
                                                }
                                            }}
                                        >
                                            {slotSchedules.map((schedule, idx) => {
                                                const teacherColor = schedule.profiles?.color;
                                                const contrastStyles = getContrastStyles(teacherColor);

                                                return (
                                                    <div
                                                        key={idx}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedSchedule(schedule);
                                                        }}
                                                        className={`px-1 md:px-2 h-[20px] md:h-[22px] rounded-md border shadow-sm flex flex-row items-center justify-between gap-0.5 transition-all hover:scale-[1.02] hover:z-20 cursor-pointer active:scale-95 ${contrastStyles} overflow-hidden`}
                                                        style={{
                                                            backgroundColor: teacherColor || '#F8FAFC'
                                                        }}
                                                    >
                                                        <span className="text-[10px] font-bold opacity-90 whitespace-nowrap shrink-0 hidden md:inline">
                                                            {schedule.time.substring(0, 5)}
                                                        </span>
                                                        <span className="text-[9px] md:text-[10.5px] font-bold truncate flex-1 text-center md:text-right">
                                                            {schedule.profiles?.full_name}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 상세 정보 팝업 */}
            {selectedSchedule && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
                    onClick={() => setSelectedSchedule(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-[280px] overflow-hidden animate-in fade-in zoom-in duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* 팝업 헤더 */}
                        <div
                            className="px-4 py-3 flex items-center justify-between border-b border-slate-50"
                            style={{ backgroundColor: selectedSchedule.profiles?.color + '20' || '#F8FAFC' }}
                        >
                            <h3 className="text-[14px] font-bold text-slate-900">수업 상세 정보</h3>
                            <button
                                onClick={() => setSelectedSchedule(null)}
                                className="p-1 hover:bg-black/5 rounded-full transition-colors"
                            >
                                <X size={16} className="text-slate-500" />
                            </button>
                        </div>

                        {/* 팝업 본문 */}
                        <div className="p-4 flex flex-col gap-3.5">
                            {/* 학생 이름 */}
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                    <User size={16} className="text-slate-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-medium text-slate-400 leading-none mb-1">학생</p>
                                    <p className="text-[14px] font-bold text-slate-900">{selectedSchedule.students?.name}</p>
                                </div>
                            </div>

                            {/* 선생님 이름 */}
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: selectedSchedule.profiles?.color || '#F1F5F9' }}
                                >
                                    <span className="text-[12px] font-bold text-white">
                                        {selectedSchedule.profiles?.full_name?.substring(0, 1)}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-medium text-slate-400 leading-none mb-1">선생님</p>
                                    <p className="text-[14px] font-bold text-slate-900">{selectedSchedule.profiles?.full_name}</p>
                                </div>
                            </div>

                            {/* 과목 항목 (추후 구현) */}
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                    <BookOpen size={16} className="text-slate-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-medium text-slate-400 leading-none mb-1">과목</p>
                                    <p className="text-[14px] font-bold text-slate-900">-</p>
                                </div>
                            </div>

                            {/* 시간 정보 */}
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                    <Watch size={16} className="text-slate-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-medium text-slate-400 leading-none mb-1">일시</p>
                                    <p className="text-[13px] font-bold text-slate-900">
                                        {format(parseISO(selectedSchedule.date), 'M월 d일')} {selectedSchedule.time.substring(0, 5)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 하단 버튼 */}
                        <div className="p-4 pt-0">
                            <button
                                onClick={() => setSelectedSchedule(null)}
                                className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-[13px] font-bold hover:bg-slate-800 transition-colors active:scale-[0.98]"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 수업 등록 모달 */}
            <AddScheduleModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                selectedDate={selectedAddDate}
                initialHour={selectedAddHour}
                onSave={() => {
                    fetchSchedules();
                    setIsAddModalOpen(false);
                }}
                userId={userId}
                userRole={userRole}
            />
        </div>
    );
}
