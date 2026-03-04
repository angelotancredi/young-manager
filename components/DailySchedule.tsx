'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, CheckCircle2, XCircle, RefreshCw, Calendar as CalendarIcon, Loader2, UserPlus, Trash2, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AlertModal from './AlertModal';

export default function DailySchedule({ isOpen, onClose, date, schedules, onAdd, onRefresh, userId, userRole }: any) {
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [attendanceList, setAttendanceList] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; studentId: string; name: string } | null>(null);
    const [requestTarget, setRequestTarget] = useState<any>(null);
    const [requestDate, setRequestDate] = useState('');
    const [requestContent, setRequestContent] = useState('');
    const [requestSaving, setRequestSaving] = useState(false);
    const [requestHour, setRequestHour] = useState('14');
    const [requestMinute, setRequestMinute] = useState('00');
    const [requestAlert, setRequestAlert] = useState<{ title: string; message: string } | null>(null);
    const [duplicateConfirm, setDuplicateConfirm] = useState<{ schedule: any; message: string } | null>(null);
    // 💡 1. 컴포넌트 로드 시 해당 날짜의 출석 데이터 및 전체 학생 목록 불러올 것
    const fetchInitialData = useCallback(async () => {
        if (!date || !isOpen) return;
        setIsFetching(true);

        try {
            // 출석 데이터 가져오기
            const { data: attData, error: attError } = await supabase
                .from('attendance')
                .select('*')
                .eq('lesson_date', date);

            // 💡 Requirement 3: 데이터가 없을 때 에러로 처리하지 말고 빈 배열([])로 상태 업데이트
            if (attError) {
                console.error("Fetch attendance error:", attError);
                setAttendanceList([]);
            } else {
                setAttendanceList(attData || []);
            }

            // 학생 목록 가져오기 (연동용)
            const { data: stData, error: stError } = await supabase
                .from('students')
                .select('id, name')
                .eq('is_active', true);

            if (stError) {
                console.error("Fetch students error:", stError);
                setStudents([]);
            } else {
                setStudents(stData || []);
            }
        } catch (err) {
            console.error("DailySchedule fetch error:", err);
            setAttendanceList([]);
            setStudents([]);
        } finally {
            // 💡 Requirement 1: 로딩 종료 보장
            setIsFetching(false);
        }
    }, [date, isOpen]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    // Supabase Realtime: schedules 테이블 변경 감지 → 자동 새로고침
    useEffect(() => {
        if (!isOpen) return;
        const channel = supabase
            .channel('schedules-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, () => {
                onRefresh?.();
                fetchInitialData();
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [isOpen]);

    // 💡 2. 출석부(attendance) DB 쓰기 로직 (수동 Upsert 처리)
    // Supabase native upsert의 on_conflict 에러(유니크 제약 조건 누락) 회피를 위해 
    // 존재 여부 확인 후 분기 처리하는 방식으로 안정성 확보
    const updateStatus = async (studentId: string, statusText: string, assignedTeacherId?: string) => {
        if (!studentId) return;
        setLoadingId(studentId);

        const statusMap: { [key: string]: string } = {
            '출석': 'present',
            '결석': 'absent',
            '보강': 'makeup'
        };

        const status = statusMap[statusText] || 'present';

        // 💡 Requirement: 해당 수업에 할당된 선생님 ID 사용 (없으면 현재 로그인한 유저 ID)
        const finalTeacherId = assignedTeacherId || userId || (await supabase.auth.getUser()).data.user?.id;

        try {
            // 🔍 먼저 해당 날짜/학생 기록이 있는지 확인
            const { data: existing, error: findError } = await supabase
                .from('attendance')
                .select('id')
                .eq('student_id', studentId)
                .eq('lesson_date', date)
                .maybeSingle();

            if (findError) console.error("Find attendance error:", findError);

            if (existing) {
                // 존재하면 Update
                const { error: upError } = await supabase
                    .from('attendance')
                    .update({
                        status,
                        teacher_id: finalTeacherId
                    })
                    .eq('id', existing.id);
                if (upError) throw upError;
            } else {
                // 없으면 Insert
                const { error: inError } = await supabase
                    .from('attendance')
                    .insert([{
                        student_id: studentId,
                        lesson_date: date,
                        status,
                        teacher_id: finalTeacherId
                    }]);
                if (inError) throw inError;
            }

            // UI 갱신 (부모 컴포넌트 포함)
            const { data, error: refreshError } = await supabase
                .from('attendance')
                .select('*')
                .eq('lesson_date', date);

            if (refreshError) console.error("Refresh attendance list error:", refreshError);
            if (data) setAttendanceList(data);

            if (onRefresh) onRefresh();
        } catch (error: any) {
            console.error("Attendance update error:", error);
            console.error("출석 저장 실패:", error.message || "알 수 없는 오류");
        } finally {
            // 💡 Requirement 1: 로딩 종료 보장
            setLoadingId(null);
        }
    };

    // 💡 삭제 확인 모달 표시
    const askDelete = (scheduleId: string, studentId: string, studentName: string) => {
        setDeleteTarget({ id: scheduleId, studentId, name: studentName });
    };

    // 💡 실제 삭제 로직
    const confirmDelete = async () => {
        if (!deleteTarget) return;
        const { id: scheduleId, studentId } = deleteTarget;
        setDeleteTarget(null);
        setDeletingId(scheduleId);

        try {
            // 1. 해당 수업의 출석 데이터 먼저 삭제 (데이터 무결성)
            if (studentId) {
                const { error: attErr } = await supabase
                    .from('attendance')
                    .delete()
                    .eq('student_id', studentId)
                    .eq('lesson_date', date);
                if (attErr) console.error('출석 삭제 에러:', attErr);
                else console.log('출석 데이터 삭제 완료');
            }

            // 2. 수업 레코드 삭제
            const { error } = await supabase
                .from('schedules')
                .delete()
                .eq('id', scheduleId);

            if (error) {
                console.error('수업 삭제 에러:', error);
                window.alert('삭제 실패: ' + error.message);
                return;
            }

            console.log('수업 삭제 성공');

            // 3. 부모 컴포넌트(Calendar) 갱신
            if (onRefresh) onRefresh();

            // 4. 출석 리스트도 갱신
            setAttendanceList(prev => prev.filter(a => !(a.student_id === studentId && a.lesson_date === date)));
        } catch (err: any) {
            console.error('수업 삭제 예외:', err);
            window.alert('삭제 중 오류 발생: ' + (err.message || '알 수 없는 오류'));
        } finally {
            setDeletingId(null);
        }
    };

    // 로컬 출석 리스트에서 상태 확인
    const getStudentStatus = (studentId: string) => {
        const record = attendanceList.find(a => a.student_id === studentId);
        if (!record) return null;

        const reverseMap: { [key: string]: string } = {
            'present': '출석',
            'absent': '결석',
            'makeup': '보강'
        };
        return reverseMap[record.status] || null;
    };

    return (
        <>
            <div
                className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            <div
                className={`fixed top-0 right-0 z-[70] w-full md:max-w-md h-full bg-[#f8fafc] shadow-2xl transition-transform duration-300 ease-in-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="flex flex-col h-full">
                    {/* 디자인 레이아웃 유지: 헤더 */}
                    <div className="p-6 bg-white border-b border-slate-100 flex justify-between items-center shadow-sm">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-800 tracking-tight">{date}</h2>
                            <p className="text-[10px] text-emerald-600 font-medium mt-0.5 uppercase tracking-widest">Attendance Management</p>
                        </div>
                        <button onClick={onClose} className="p-2.5 bg-slate-100 text-slate-500 rounded-full active:scale-90 transition-transform">
                            <X size={20} />
                        </button>
                    </div>

                    {/* 디자인 레이아웃 유지: 명단 리스트 */}
                    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
                        {isFetching && attendanceList.length === 0 ? (
                            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-emerald-600" /></div>
                        ) : schedules.length > 0 ? (
                            schedules.map((s: any) => {
                                const currentStatus = getStudentStatus(s.student_id);
                                return (
                                    <div key={s.id} className="bg-white p-2.5 pl-5 rounded-xl border border-slate-100 shadow-sm transition-all text-black">
                                        <div className="flex items-center justify-between gap-1.5">
                                            {/* 좌측: 2줄 구조 */}
                                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                                                {/* 1줄: 시간 + 학생이름 */}
                                                <div className="flex items-center gap-2">
                                                    <div className="w-10 h-7 bg-slate-50 rounded-md flex items-center justify-center text-slate-700 shrink-0">
                                                        <span className="text-[15px] font-extrabold leading-tight">{s.time.substring(0, 5)}</span>
                                                    </div>
                                                    <div className="font-extrabold text-black text-[17px] leading-tight truncate">
                                                        {s.students?.name}
                                                    </div>
                                                    {s.is_makeup && (
                                                        <span className="px-1 py-0.5 bg-amber-100 text-amber-600 text-[8px] font-bold rounded-md shrink-0">보강</span>
                                                    )}
                                                </div>
                                                {/* 2줄: 담당 + 교사이름 */}
                                                <div className="flex items-center">
                                                    <div className="flex items-center gap-1.5 px-2.5 h-7 bg-slate-100 text-black text-[14px] font-bold rounded-md border border-slate-200 shrink-0">
                                                        <span className="text-slate-400 text-[12px] font-semibold">담당</span>
                                                        <span className="w-px h-3.5 bg-slate-300"></span>
                                                        <span>{s.profiles?.full_name || '담당자 없음'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {userRole === 'admin' ? (
                                                <div className="flex gap-1 shrink-0">
                                                    <button
                                                        disabled={loadingId === s.student_id || !s.student_id}
                                                        onClick={() => updateStatus(s.student_id, '출석', s.teacher_id)}
                                                        className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-all active:scale-95 ${currentStatus === '출석'
                                                            ? 'bg-emerald-500 text-white shadow-md'
                                                            : 'bg-slate-50 text-emerald-600 border border-emerald-100'}`}
                                                    >
                                                        <CheckCircle2 size={20} strokeWidth={2.5} />
                                                        <span className="text-[12px] font-semibold mt-0.5">출석</span>
                                                    </button>
                                                    <button
                                                        disabled={loadingId === s.student_id || !s.student_id}
                                                        onClick={() => updateStatus(s.student_id, '결석', s.teacher_id)}
                                                        className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-all active:scale-95 ${currentStatus === '결석'
                                                            ? 'bg-rose-500 text-white shadow-md'
                                                            : 'bg-slate-50 text-rose-600 border border-rose-100'}`}
                                                    >
                                                        <XCircle size={20} strokeWidth={2.5} />
                                                        <span className="text-[12px] font-semibold mt-0.5">결석</span>
                                                    </button>
                                                    <button
                                                        disabled={loadingId === s.student_id || !s.student_id}
                                                        onClick={() => updateStatus(s.student_id, '보강', s.teacher_id)}
                                                        className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-all active:scale-95 ${currentStatus === '보강'
                                                            ? 'bg-amber-500 text-white shadow-md'
                                                            : 'bg-slate-50 text-amber-600 border border-amber-100'}`}
                                                    >
                                                        <RefreshCw size={20} strokeWidth={2.5} />
                                                        <span className="text-[12px] font-semibold mt-0.5">보강</span>
                                                    </button>
                                                    <button
                                                        disabled={deletingId === s.id}
                                                        onClick={() => {
                                                            askDelete(s.id, s.student_id, s.students?.name || '학생');
                                                        }}
                                                        className="flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-all active:scale-95 bg-slate-50 text-red-400 border border-red-100 hover:bg-red-500 hover:text-white hover:border-red-500"
                                                    >
                                                        {deletingId === s.id ? (
                                                            <Loader2 size={20} className="animate-spin" />
                                                        ) : (
                                                            <Trash2 size={20} strokeWidth={2.5} />
                                                        )}
                                                        <span className="text-[12px] font-semibold mt-0.5">삭제</span>
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="shrink-0">
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                const { data: existing, error } = await supabase
                                                                    .from('schedule_requests')
                                                                    .select('id, status')
                                                                    .eq('schedule_id', s.id)
                                                                    .in('status', ['pending', 'approved', 'rejected'])
                                                                    .limit(1);
                                                                if (!error && existing && existing.length > 0) {
                                                                    const st = existing[0].status;
                                                                    const msg = st === 'pending' ? '이미 대기중인 요청이 있습니다.\n다시 요청하시겠습니까?'
                                                                        : st === 'approved' ? '이미 승인된 요청이 있습니다.\n다시 요청하시겠습니까?'
                                                                            : '거절된 요청이 있습니다.\n다시 요청하시겠습니까?';
                                                                    setDuplicateConfirm({ schedule: s, message: msg });
                                                                    return;
                                                                }
                                                            } catch (e) {
                                                                console.error('중복체크 실패:', e);
                                                            }
                                                            setRequestTarget(s);
                                                            setRequestDate('');
                                                            setRequestContent('');
                                                            setRequestHour('14');
                                                            setRequestMinute('00');
                                                        }}
                                                        className="flex items-center justify-center gap-1.5 h-12 px-4 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 font-bold text-[12px] transition-all active:scale-95 hover:bg-blue-100"
                                                    >
                                                        <CalendarIcon size={16} />
                                                        <span>일정변경요청</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {
                                            currentStatus === '결석' && (
                                                <div className="mt-3 p-3 bg-rose-50 rounded-2xl border border-rose-100 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <div className="flex items-center justify-between text-[12px] font-medium text-rose-500 mb-2 px-1">
                                                        <span>보강 예정일</span>
                                                        <span className="bg-white px-2 py-0.5 rounded-full border border-rose-200">{s.makeup_date || '미정'}</span>
                                                    </div>
                                                    <button className="w-full py-2.5 bg-white text-rose-500 text-[12px] font-semibold rounded-xl border border-rose-200 shadow-sm flex items-center justify-center gap-1.5 active:bg-rose-50 transition-colors">
                                                        <CalendarIcon size={14} /> 보강 일정 잡기
                                                    </button>
                                                </div>
                                            )
                                        }
                                    </div>
                                );
                            })
                        ) : (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-300 text-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                    <Plus size={30} strokeWidth={1.5} className="text-slate-200" />
                                </div>
                                <p className="font-medium text-slate-400">등록된 수업이 없습니다.</p>
                                {userRole === 'admin' && <p className="text-[11px] mt-1 text-slate-300">아래 버튼을 눌러 수업을 추가하세요.</p>}
                            </div>
                        )}
                    </div>

                    {/* 하단 영역 */}
                    {userRole === 'admin' && (
                        <div className="p-6 bg-white border-t border-slate-100 pb-10">
                            <button
                                onClick={onAdd}
                                className="w-full py-5 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 active:scale-95 transition-all text-lg font-bold"
                            >
                                <UserPlus size={22} strokeWidth={2.5} />
                                <span>새 수업 등록하기</span>
                            </button>
                        </div>
                    )}
                </div>
            </div >
            {/* 삭제 확인 모달 */}
            {
                deleteTarget && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[80] p-6">
                        <div className="bg-white w-full max-w-sm rounded-2xl p-8 shadow-2xl text-center">
                            <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                <Trash2 size={28} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">수업 삭제</h3>
                            <p className="text-slate-500 text-sm font-medium mb-6">
                                <span className="font-bold text-slate-700">{deleteTarget.name}</span> 학생의<br />수업 일정을 삭제하시겠습니까?
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteTarget(null)}
                                    className="flex-1 py-3.5 font-bold text-slate-400 hover:text-slate-600 transition-colors rounded-xl"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 py-3.5 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-100 hover:bg-red-600 active:scale-95 transition-all"
                                >
                                    삭제하기
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* 일정변경요청 모달 */}
            {
                requestTarget && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[80] p-6">
                        <div className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl">
                            <div className="bg-amber-500 p-5 text-white">
                                <h3 className="text-lg font-bold">일정변경 요청</h3>
                                <p className="text-amber-100 text-sm mt-1">
                                    {requestTarget.students?.name} · {date} · {requestTarget.time?.substring(0, 5)}
                                </p>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-sm font-bold text-slate-700 mb-1.5 block">변경 희망일</label>
                                    <input
                                        type="date"
                                        value={requestDate}
                                        onChange={(e) => setRequestDate(e.target.value)}
                                        className="w-full p-3.5 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-700 mb-1.5 block">변경 희망 시간</label>
                                    <div className="flex gap-3 items-center">
                                        <select
                                            value={requestHour}
                                            onChange={(e) => setRequestHour(e.target.value)}
                                            className="flex-1 p-3.5 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-center font-bold text-lg"
                                        >
                                            {Array.from({ length: 14 }, (_, i) => String(i + 9).padStart(2, '0')).map(h => <option key={h} value={h}>{h}시</option>)}
                                        </select>
                                        <span className="font-bold text-slate-400">:</span>
                                        <select
                                            value={requestMinute}
                                            onChange={(e) => setRequestMinute(e.target.value)}
                                            className="flex-1 p-3.5 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-center font-bold text-lg"
                                        >
                                            {['00', '10', '20', '30', '40', '50'].map(m => <option key={m} value={m}>{m}분</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-700 mb-1.5 block">요청 사유</label>
                                    <textarea
                                        value={requestContent}
                                        onChange={(e) => setRequestContent(e.target.value)}
                                        placeholder="변경 사유를 입력하세요"
                                        rows={3}
                                        className="w-full p-3.5 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 font-medium resize-none"
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setRequestTarget(null)}
                                        className="flex-1 py-3.5 font-bold text-slate-400 hover:text-slate-600 transition-colors rounded-xl"
                                    >
                                        취소
                                    </button>
                                    <button
                                        disabled={!requestDate || requestSaving}
                                        onClick={async () => {
                                            setRequestSaving(true);
                                            const { error } = await supabase.from('schedule_requests').insert([{
                                                requester_id: userId,
                                                student_id: requestTarget.student_id,
                                                schedule_id: requestTarget.id,
                                                request_type: 'reschedule',
                                                content: `희망시간: ${requestHour}:${requestMinute}${requestContent ? '\n사유: ' + requestContent : ''}`,
                                                requested_date: requestDate,
                                                status: 'pending'
                                            }]);
                                            setRequestSaving(false);
                                            if (!error) {
                                                setRequestTarget(null);
                                                setRequestAlert({ title: '일정변경 요청', message: '일정변경 요청이\n전송되었습니다.' });
                                            } else {
                                                console.error('요청 실패:', error);
                                                setRequestAlert({ title: '요청 실패', message: '요청 실패: ' + error.message });
                                            }
                                        }}
                                        className="flex-1 py-3.5 bg-amber-500 text-white rounded-xl font-bold shadow-lg shadow-amber-100 hover:bg-amber-600 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {requestSaving ? <Loader2 size={18} className="animate-spin" /> : <><Send size={16} /> 요청하기</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            <AlertModal
                isOpen={!!requestAlert}
                onClose={() => setRequestAlert(null)}
                title={requestAlert?.title || ''}
                message={requestAlert?.message || ''}
            />
            {/* 중복 요청 확인 모달 */}
            {duplicateConfirm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[80] p-6">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 text-center shadow-2xl">
                        <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CalendarIcon size={28} className="text-amber-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">중복 요청</h3>
                        <p className="text-slate-500 text-sm font-medium mb-6 whitespace-pre-line">{duplicateConfirm.message}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDuplicateConfirm(null)}
                                className="flex-1 py-3.5 font-bold text-slate-400 hover:text-slate-600 transition-colors rounded-xl"
                            >
                                취소
                            </button>
                            <button
                                onClick={() => {
                                    const s = duplicateConfirm.schedule;
                                    setDuplicateConfirm(null);
                                    setRequestTarget(s);
                                    setRequestDate('');
                                    setRequestContent('');
                                    setRequestHour('14');
                                    setRequestMinute('00');
                                }}
                                className="flex-1 py-3.5 bg-amber-500 text-white rounded-xl font-bold shadow-lg shadow-amber-100 hover:bg-amber-600 active:scale-95 transition-all"
                            >
                                계속 요청
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
