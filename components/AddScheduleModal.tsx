'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Loader2, Calendar as CalendarIcon, Clock, User } from 'lucide-react';
import AlertModal from './AlertModal';
import { useBackClose } from '@/hooks/useBackClose';
export default function AddScheduleModal({ isOpen, onClose, selectedDate, onSave, userId, userRole, initialHour, initialMinute }: any) {
    useBackClose(isOpen, onClose);
    const [students, setStudents] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [studentId, setStudentId] = useState('');
    const [teacherId, setTeacherId] = useState(userId || '');

    // 시간/분 분리 선택
    const [hour, setHour] = useState(initialHour || '14');
    const [minute, setMinute] = useState(initialMinute || '00');
    const [isMakeup, setIsMakeup] = useState(false);
    const [loading, setLoading] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [repeatResult, setRepeatResult] = useState<{ success: number; skip: number } | null>(null);
    const [isRepeatMonth, setIsRepeatMonth] = useState(false);

    // 이번 달 같은 요일 전체 등록
    const handleRepeatMonth = async () => {
        if (!studentId || !teacherId) {
            setAlertMessage('학생과 선생님을 먼저 선택해주세요.');
            return;
        }
        setLoading(true);

        const timeValue = `${hour}:${minute}:00`;
        const base = new Date(selectedDate);
        const targetDayOfWeek = base.getDay();
        const year = base.getFullYear();
        const month = base.getMonth();

        // 해당 월의 같은 요일 날짜 전부 수집
        const sameDayDates: string[] = [];
        const d = new Date(year, month, 1);
        while (d.getMonth() === month) {
            if (d.getDay() === targetDayOfWeek) {
                // 💡 타임존 이슈 방지를 위해 로컬 날짜 문자열 직접 생성
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const dateStr = `${yyyy}-${mm}-${dd}`;
                sameDayDates.push(dateStr);
            }
            d.setDate(d.getDate() + 1);
        }

        let successCount = 0;
        let skipCount = 0;

        for (const dateStr of sameDayDates) {
            // 중복 체크
            const { data: existing } = await supabase
                .from('schedules')
                .select('id')
                .eq('date', dateStr)
                .eq('time', timeValue)
                .eq('student_id', studentId)
                .limit(1);

            if (existing && existing.length > 0) {
                skipCount++;
                continue;
            }

            const { error } = await supabase.from('schedules').insert([{
                date: dateStr,
                time: timeValue,
                student_id: studentId,
                teacher_id: teacherId,
                is_makeup: false,
                status: 'confirmed'
            }]);

            if (!error) successCount++;
            else skipCount++;
        }

        setLoading(false);
        setRepeatResult({ success: successCount, skip: skipCount });
        onSave();
    };

    // 💡 드롭다운 상호 배타적 열림 관리를 위한 상태
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

    // 시간 옵션 (09시~22시)
    const hours = Array.from({ length: 14 }, (_, i) => String(i + 9).padStart(2, '0'));
    // 분 옵션 (10분 단위)
    const minutes = ['00', '10', '20', '30', '40', '50'];

    useEffect(() => {
        if (isOpen) {
            // 💡 모달이 열릴 때 상태 초기화
            setStudentId('');
            setTeacherId(userId || '');
            setHour(initialHour || '14');
            setMinute(initialMinute || '00');
            setIsMakeup(false);
            setIsRepeatMonth(false);
            setOpenDropdownId(null);

            if (userRole === 'teacher' && userId) {
                setTeacherId(userId);
            }
            const fetchData = async () => {
                setLoading(true);
                try {
                    const { data: st, error: stError } = await supabase.from('students').select('*').eq('is_active', true);
                    const { data: tc, error: tcError } = await supabase
                        .from('profiles')
                        .select('*')
                        .in('role', ['admin', 'teacher']);

                    if (stError) console.error("Students fetch error:", stError);
                    if (tcError) console.error("Teachers fetch error:", tcError);

                    // 학생 가나다순 정렬
                    const sortedStudents = (st || []).sort((a: any, b: any) =>
                        (a.name || '').localeCompare(b.name || '', 'ko')
                    );

                    // 교사 정렬: 
                    // 1. 원장님 (role='admin') 최상위
                    // 2. 일반 강사 (role='teacher') 하단
                    const sortedTeachers = (tc || []).sort((a: any, b: any) => {
                        // 원장님(admin)은 강사(teacher)보다 위
                        if (a.role === 'admin' && b.role !== 'admin') return -1;
                        if (a.role !== 'admin' && b.role === 'admin') return 1;

                        // 나머지는 이름순
                        return (a.full_name || '').localeCompare(b.full_name || '', 'ko');
                    });

                    setStudents(sortedStudents);
                    setTeachers(sortedTeachers);
                } catch (err) {
                    console.error("fetchData exception:", err);
                    setStudents([]);
                    setTeachers([]);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }
    }, [isOpen, userId, userRole]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const timeValue = `${hour}:${minute}:00`;

        // 중복 체크: 같은 날짜 + 시간 + 학생
        const { data: existing } = await supabase
            .from('schedules')
            .select('id')
            .eq('date', selectedDate)
            .eq('time', timeValue)
            .eq('student_id', studentId)
            .limit(1);

        if (existing && existing.length > 0) {
            setAlertMessage('해당 시간에 이미 같은 학생의 수업이\n등록되어 있습니다.');
            setLoading(false);
            return;
        }

        const { error } = await supabase.from('schedules').insert([
            {
                date: selectedDate,
                time: timeValue,
                student_id: studentId,
                teacher_id: teacherId,
                is_makeup: isMakeup,
                status: 'confirmed'
            }
        ]);

        if (error) {
            console.error('저장 실패:', error.message);
            setAlertMessage('수업 저장에 실패했습니다.\n다시 시도해주세요.');
            setLoading(false);
            return;
        }

        // 💡 이번 달 같은 요일 전체 등록이 체크된 경우
        if (isRepeatMonth) {
            await handleRepeatMonth();
        } else {
            onSave();
            onClose();
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[80] p-4 transition-all" onClick={() => setOpenDropdownId(null)}>
                <div className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90dvh]" onClick={(e) => e.stopPropagation()}>
                    {/* 상단 디자인 헤더 */}
                    <div className="bg-emerald-600 p-6 text-white relative shrink-0">
                        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition">
                            <X size={20} />
                        </button>
                        <div className="flex items-center gap-3 mb-1">
                            <CalendarIcon size={20} className="text-emerald-200" />
                            <span className="text-emerald-100 font-medium">{selectedDate}</span>
                        </div>
                        <h2 className="text-2xl font-bold">새 수업 등록</h2>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 pb-32 space-y-6 overflow-y-auto">

                        {/* 학생 선택 */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                                <User size={16} className="text-emerald-500" /> 대상 학생
                            </label>
                            <CustomDropdown
                                id="student"
                                openId={openDropdownId}
                                setOpenId={setOpenDropdownId}
                                value={studentId}
                                options={students}
                                onChange={setStudentId}
                                placeholder="학생을 선택하세요"
                                labelField="name"
                            />
                        </div>

                        {/* 선생님 선택 */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                                <User size={16} className="text-emerald-500" /> 담당 선생님
                            </label>
                            <CustomDropdown
                                id="teacher"
                                openId={openDropdownId}
                                setOpenId={setOpenDropdownId}
                                value={teacherId}
                                options={teachers}
                                onChange={setTeacherId}
                                placeholder="선생님을 선택하세요"
                                labelField="full_name"
                                labelSubField={(t: any) => t.role === 'admin' ? '원장' : '교사'}
                                disabled={userRole === 'teacher'}
                            />
                        </div>

                        {/* 시간 선택 (10분 단위 커스텀) */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                                <Clock size={16} className="text-emerald-500" /> 수업 시간
                            </label>
                            <div className="flex gap-3 items-center">
                                <CustomDropdown
                                    id="hour"
                                    openId={openDropdownId}
                                    setOpenId={setOpenDropdownId}
                                    value={hour}
                                    options={hours.map(h => ({ id: h, label: `${h}시` }))}
                                    onChange={setHour}
                                    className="flex-1"
                                    alignCenter
                                />
                                <span className="font-bold text-slate-400">:</span>
                                <CustomDropdown
                                    id="minute"
                                    openId={openDropdownId}
                                    setOpenId={setOpenDropdownId}
                                    value={minute}
                                    options={minutes.map(m => ({ id: m, label: `${m}분` }))}
                                    onChange={setMinute}
                                    className="flex-1"
                                    alignCenter
                                />
                            </div>
                        </div>

                        {/* 이번 달 같은 요일 전체 등록 */}
                        <div className="flex items-center gap-3 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                            <label className="flex items-center gap-3 cursor-pointer select-none w-full">
                                <input
                                    type="checkbox"
                                    checked={isRepeatMonth}
                                    onChange={(e) => setIsRepeatMonth(e.target.checked)}
                                    className="w-5 h-5 rounded-md border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <div className="flex-1">
                                    <span className="font-bold text-slate-700 text-sm">이번 달 같은 요일, 같은 시간에 등록하시겠습니까?</span>
                                    <p className="text-[10px] text-slate-400">
                                        {selectedDate ? (() => {
                                            const d = new Date(selectedDate);
                                            const days = ['일', '월', '화', '수', '목', '금', '토'];
                                            return `${d.getMonth() + 1}월의 모든 ${days[d.getDay()]}요일, 같은 시간에 등록합니다.`;
                                        })() : ''}
                                    </p>
                                </div>
                            </label>
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
            <AlertModal
                isOpen={!!alertMessage}
                onClose={() => setAlertMessage('')}
                title="알림"
                message={alertMessage}
            />
            <AlertModal
                isOpen={!!repeatResult}
                onClose={() => { setRepeatResult(null); onClose(); }}
                title="전체 등록 완료"
                message={`${repeatResult?.success}개 등록 완료${repeatResult?.skip ? `\n${repeatResult.skip}개는 중복으로 건너뜀` : ''}`}
            />
        </>
    );
}

// --- 커스텀 드롭다운 컴포넌트 ---
function CustomDropdown({ id, openId, setOpenId, value, options, onChange, placeholder, labelField = 'label', labelSubField, disabled, className = '', alignCenter = false }: any) {
    const isOpen = openId === id;
    const selectedOption = options.find((o: any) => o.id === value);

    const toggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (disabled) return;
        setOpenId(isOpen ? null : id);
    };

    return (
        <div className={`relative ${className}`}>
            <button
                type="button"
                disabled={disabled}
                onClick={toggle}
                className={`w-full p-4 bg-slate-50 border-none rounded-2xl outline-none transition-all text-slate-800 font-medium flex items-center justify-between
                    ${isOpen ? 'ring-2 ring-emerald-500 bg-white shadow-md' : ''}
                    ${disabled ? 'opacity-70 cursor-not-allowed' : 'hover:bg-slate-100'}
                    ${alignCenter ? 'justify-center font-bold text-lg' : ''}
                `}
            >
                <span className="truncate">
                    {selectedOption
                        ? (labelSubField
                            ? `${selectedOption[labelField]} (${labelSubField(selectedOption)})`
                            : selectedOption[labelField])
                        : placeholder
                    }
                </span>
                {!alignCenter && (
                    <svg className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                )}
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 w-full left-0 bg-white shadow-2xl rounded-2xl max-h-60 overflow-y-auto z-[90] border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="py-2">
                        {options.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-slate-400 text-center italic">데이터가 없습니다</div>
                        ) : (
                            options.map((option: any) => (
                                <div
                                    key={option.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onChange(option.id);
                                        setOpenId(null);
                                    }}
                                    className={`px-5 py-3.5 text-sm cursor-pointer transition-colors flex items-center justify-between
                                        ${value === option.id ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}
                                        ${alignCenter ? 'justify-center border-b border-slate-50 last:border-none' : ''}
                                    `}
                                >
                                    <span>
                                        {option[labelField]}
                                        {labelSubField && !alignCenter && (
                                            <span className="text-[10px] ml-1.5 opacity-60 font-normal">
                                                ({labelSubField(option)})
                                            </span>
                                        )}
                                    </span>
                                    {value === option.id && !alignCenter && (
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
