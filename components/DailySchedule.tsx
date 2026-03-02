'use client';

import React, { useState } from 'react';
import { X, Plus, CheckCircle2, XCircle, RefreshCw, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function DailySchedule({ isOpen, onClose, date, schedules, onAdd, onRefresh }: any) {
    const [loadingId, setLoadingId] = useState<string | null>(null);

    // 출석 상태 업데이트 로직
    const updateStatus = async (id: string, status: string) => {
        setLoadingId(id);
        const { error } = await supabase
            .from('schedules')
            .update({ attendance_status: status })
            .eq('id', id);

        if (error) {
            alert("상태 업데이트 실패: " + error.message);
        } else {
            // 부모 컴포넌트(Calendar)의 데이터를 새로고침하여 즉시 반영
            if (onRefresh) onRefresh();
        }
        setLoadingId(null);
    };

    return (
        <>
            {/* 1. 배경 어둡게 */}
            <div
                className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
            />

            {/* 2. 상세 창 (오른쪽 슬라이드) */}
            <div
                className={`fixed top-0 right-0 z-[70] w-[85%] max-w-md h-full bg-[#f8fafc] shadow-2xl transition-transform duration-300 ease-in-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* 헤더 */}
                    <div className="p-6 bg-white border-b border-slate-100 flex justify-between items-center shadow-sm">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-800 tracking-tight">{date}</h2>
                            <p className="text-[10px] text-indigo-600 font-medium mt-0.5 uppercase tracking-widest">Attendance Management</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2.5 bg-slate-100 text-slate-500 rounded-full active:scale-90 transition-transform"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* 명단 리스트 */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-5">
                        {schedules.length > 0 ? (
                            schedules.map((s: any) => (
                                <div key={s.id} className="bg-white p-2.5 rounded-[1.5rem] border border-slate-100 shadow-sm transition-all text-black">
                                    <div className="flex items-center justify-between gap-1.5">
                                        {/* 왼쪽: 시간 */}
                                        <div className="w-9 h-9 bg-slate-50 rounded-lg flex flex-col items-center justify-center text-slate-700 shrink-0">
                                            <span className="text-[7px] font-medium leading-none text-slate-400">TIME</span>
                                            <span className="text-[11px] font-bold leading-tight">{s.time.substring(0, 5)}</span>
                                        </div>

                                        {/* 중앙: 이름 및 담당자 (가로 정렬 및 중앙 집중) */}
                                        <div className="flex-1 flex items-center justify-center gap-2 min-w-0 px-1 overflow-hidden">
                                            <div className="font-bold text-black text-[15px] leading-tight truncate">
                                                {s.students?.name}
                                            </div>
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-black text-[10px] font-bold rounded border border-slate-200 shrink-0">
                                                <span className="text-slate-500 text-[8px] font-medium">담당</span>
                                                <span className="w-px h-2 bg-slate-300 mx-0.5"></span>
                                                <span>{s.profiles?.name || '김원장'}</span>
                                            </div>
                                            {s.is_makeup && (
                                                <span className="px-1 py-0.5 bg-amber-100 text-amber-600 text-[8px] font-bold rounded shrink-0">보강</span>
                                            )}
                                        </div>

                                        {/* 오른쪽: 출결 버튼 그룹 (수직 스택으로 가로 공간 확보) */}
                                        <div className="flex gap-1 shrink-0">
                                            <button
                                                disabled={loadingId === s.id}
                                                onClick={() => updateStatus(s.id, '출석')}
                                                className={`flex flex-col items-center justify-center w-12 py-1.5 rounded-xl transition-all active:scale-95 ${s.attendance_status === '출석'
                                                    ? 'bg-emerald-500 text-white shadow-md'
                                                    : 'bg-slate-50 text-emerald-600 border border-emerald-100'
                                                    }`}
                                            >
                                                <CheckCircle2 size={18} strokeWidth={2.5} />
                                                <span className="text-[10px] font-semibold mt-0.5">출석</span>
                                            </button>
                                            <button
                                                disabled={loadingId === s.id}
                                                onClick={() => updateStatus(s.id, '결석')}
                                                className={`flex flex-col items-center justify-center w-12 py-1.5 rounded-xl transition-all active:scale-95 ${s.attendance_status === '결석'
                                                    ? 'bg-rose-500 text-white shadow-md'
                                                    : 'bg-slate-50 text-rose-600 border border-rose-100'
                                                    }`}
                                            >
                                                <XCircle size={18} strokeWidth={2.5} />
                                                <span className="text-[10px] font-semibold mt-0.5">결석</span>
                                            </button>
                                            <button
                                                disabled={loadingId === s.id}
                                                onClick={() => updateStatus(s.id, '보강')}
                                                className={`flex flex-col items-center justify-center w-12 py-1.5 rounded-xl transition-all active:scale-95 ${s.attendance_status === '보강'
                                                    ? 'bg-amber-500 text-white shadow-md'
                                                    : 'bg-slate-50 text-amber-600 border border-amber-100'
                                                    }`}
                                            >
                                                <RefreshCw size={18} strokeWidth={2.5} />
                                                <span className="text-[10px] font-semibold mt-0.5">보강</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* 결석 시 보강 관리 섹션 */}
                                    {s.attendance_status === '결석' && (
                                        <div className="mt-3 p-3 bg-rose-50 rounded-2xl border border-rose-100 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="flex items-center justify-between text-[11px] font-medium text-rose-500 mb-2 px-1">
                                                <span>보강 예정일</span>
                                                <span className="bg-white px-2 py-0.5 rounded-full border border-rose-200">
                                                    {s.makeup_date || '미정'}
                                                </span>
                                            </div>
                                            <button className="w-full py-2.5 bg-white text-rose-500 text-[11px] font-semibold rounded-xl border border-rose-200 shadow-sm flex items-center justify-center gap-1.5 active:bg-rose-50 transition-colors">
                                                <CalendarIcon size={14} /> 보강 일정 잡기
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-300 text-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                    <Plus size={30} strokeWidth={1.5} className="text-slate-200" />
                                </div>
                                <p className="font-medium text-slate-400">등록된 수업이 없습니다.</p>
                                <p className="text-[11px] mt-1 text-slate-300">아래 버튼을 눌러 수업을 추가하세요.</p>
                            </div>
                        )}
                    </div>

                    {/* 하단 버튼 */}
                    <div className="p-6 bg-white border-t border-slate-100 pb-10">
                        <button
                            onClick={onAdd}
                            className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            <Plus size={22} strokeWidth={2.5} />
                            <span className="font-semibold tracking-tight">새로운 학생 추가하기</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}