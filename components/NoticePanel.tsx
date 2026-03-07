'use client';

import React, { useState, useEffect } from 'react';
import { X, Bell, Plus, Send, Loader2, Trash2, ChevronDown, CalendarDays, Check, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useBackClose } from '@/hooks/useBackClose';

interface NoticePanelProps {
    isOpen: boolean;
    onClose: () => void;
    userRole: string | null;
    userId?: string;
    onStatusChange?: () => void;
}

export default function NoticePanel({ isOpen, onClose, userRole, userId, onStatusChange }: NoticePanelProps) {
    useBackClose(isOpen, onClose);
    const [notices, setNotices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isWriting, setIsWriting] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [deleteNoticeId, setDeleteNoticeId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [readStatus, setReadStatus] = useState<Record<string, string[]>>({});
    const [allTeachers, setAllTeachers] = useState<any[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'notices' | 'requests'>('notices');
    const [requests, setRequests] = useState<any[]>([]);
    const [requestsLoading, setRequestsLoading] = useState(false);
    const [rejectTarget, setRejectTarget] = useState<any>(null);
    const [rejectReason, setRejectReason] = useState('');

    // 공지사항 불러오기
    const fetchNotices = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('notices')
                .select('*, profiles!author_id (full_name)')
                .order('created_at', { ascending: false });

            if (error) console.error('공지 조회 에러:', error);
            const list = data || [];
            setNotices(list);
            if ((userRole === 'admin' || userRole === 'owner') && list.length > 0) {
                fetchReadStatus(list.map((n: any) => n.id));
            }
        } catch (err) {
            console.error('공지 조회 예외:', err);
            setNotices([]);
        } finally {
            setIsLoading(false);
        }
    };

    // 관리자용: 공지별 읽음 현황 + 교사 목록 가져오기
    const fetchReadStatus = async (noticeIds: string[]) => {
        if ((userRole !== 'admin' && userRole !== 'owner') || noticeIds.length === 0) return;
        try {
            // 1. 전체 사용자 목록(관리자 포함) 가져오기
            const { data: teachers } = await supabase
                .from('profiles')
                .select('id, full_name, role');
            setAllTeachers(teachers || []);

            // 2. 읽음 기록 (user_id만)
            const { data: reads, error } = await supabase
                .from('notice_reads')
                .select('notice_id, user_id')
                .in('notice_id', noticeIds);

            if (error) {
                console.error('읽음 현황 에러:', error);
                return;
            }

            // 3. user_id를 교사 이름으로 매핑
            const teacherMap = new Map((teachers || []).map((t: any) => [t.id, t.full_name]));
            const map: Record<string, string[]> = {};
            (reads || []).forEach((r: any) => {
                const name = teacherMap.get(r.user_id);
                if (name) {
                    if (!map[r.notice_id]) map[r.notice_id] = [];
                    map[r.notice_id].push(name);
                }
            });
            setReadStatus(map);
        } catch (err) {
            console.error('Read status error:', err);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchNotices();
            setIsWriting(false);
            setTitle('');
            setContent('');

            // 패널을 열면 모든 공지를 읽음으로 처리
            markAllAsRead();
        }
    }, [isOpen]);

    // 일정변경 요청 불러오기
    const fetchRequests = async () => {
        setRequestsLoading(true);
        try {
            let query = supabase
                .from('schedule_requests')
                .select('*')
                .order('created_at', { ascending: false });

            if (userRole !== 'admin' && userRole !== 'owner' && userId) {
                query = query.eq('requester_id', userId);
            }

            const { data, error } = await query;
            if (error) { console.error('요청 조회 에러:', error); setRequests([]); return; }

            const reqs = data || [];
            // 요청자/학생 이름 매핑
            const requesterIds = [...new Set(reqs.map(r => r.requester_id).filter(Boolean))];
            const studentIds = [...new Set(reqs.map(r => r.student_id).filter(Boolean))];

            const scheduleIds = [...new Set(reqs.map(r => r.schedule_id).filter(Boolean))];

            const [{ data: profiles }, { data: studs }, { data: scheds }] = await Promise.all([
                requesterIds.length > 0 ? supabase.from('profiles').select('id, full_name').in('id', requesterIds) : { data: [] },
                studentIds.length > 0 ? supabase.from('students').select('id, name').in('id', studentIds) : { data: [] },
                scheduleIds.length > 0 ? supabase.from('schedules').select('id, date, time').in('id', scheduleIds) : { data: [] }
            ]);

            const profileMap: Record<string, string> = {};
            (profiles || []).forEach((p: any) => { profileMap[p.id] = p.full_name; });
            const studentMap: Record<string, string> = {};
            (studs || []).forEach((s: any) => { studentMap[s.id] = s.name; });
            const schedMap: Record<string, any> = {};
            (scheds || []).forEach((sc: any) => { schedMap[sc.id] = sc; });

            setRequests(reqs.map(r => ({
                ...r,
                profiles: { full_name: profileMap[r.requester_id] || '알 수 없음' },
                students: { name: studentMap[r.student_id] || '학생' },
                schedule: schedMap[r.schedule_id] || null
            })));
        } catch (err) {
            console.error('요청 조회 예외:', err);
        } finally {
            setRequestsLoading(false);
        }
    };

    // 관리자: 요청 승인
    const handleApprove = async (req: any) => {
        // 1. content에서 희망시간 파싱
        const timeMatch = req.content?.match(/희망시간: (\d{2}):(\d{2})/);
        const time = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}:00` : '14:00:00';

        // 2. schedules에 새 수업 등록
        const { error: schedErr } = await supabase.from('schedules').insert([{
            date: req.requested_date,
            time: time,
            student_id: req.student_id,
            teacher_id: req.requester_id,
            is_makeup: req.request_type === 'makeup',
            status: 'confirmed'
        }]);

        if (schedErr) {
            console.error('스케줄 등록 실패:', schedErr);
            return;
        }

        // 3. 요청 상태 업데이트
        await supabase
            .from('schedule_requests')
            .update({ status: 'approved', processed_at: new Date().toISOString() })
            .eq('id', req.id);

        fetchRequests();
        onStatusChange?.();
    };

    // 관리자: 거절 사유 저장
    const handleRejectConfirm = async () => {
        if (!rejectTarget) return;
        await supabase
            .from('schedule_requests')
            .update({
                status: 'rejected',
                processed_at: new Date().toISOString(),
                admin_comment: rejectReason || '사유 없음'
            })
            .eq('id', rejectTarget.id);
        setRejectTarget(null);
        setRejectReason('');
        fetchRequests();
        onStatusChange?.();
    };

    // 관리자: 요청 삭제
    const handleDeleteRequest = async (requestId: string) => {
        const { error } = await supabase
            .from('schedule_requests')
            .delete()
            .eq('id', requestId);
        if (!error) { fetchRequests(); onStatusChange?.(); }
    };

    // 읽음 처리: 모든 공지에 대해 notice_reads 삽입
    const markAllAsRead = async () => {
        if (!userId) return;
        try {
            const { data: notices } = await supabase.from('notices').select('id');
            if (!notices || notices.length === 0) return;

            const { data: existing } = await supabase
                .from('notice_reads')
                .select('notice_id')
                .eq('user_id', userId);

            const readIds = new Set((existing || []).map(r => r.notice_id));
            const unread = notices.filter(n => !readIds.has(n.id));

            if (unread.length > 0) {
                await supabase.from('notice_reads').insert(
                    unread.map(n => ({ notice_id: n.id, user_id: userId }))
                );
            }
        } catch (err) {
            console.error('Mark read error:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;
        setIsSaving(true);

        try {
            const insertData: any = {
                title: title.trim(),
                content: content.trim(),
            };
            // author_id 컬럼이 있으면 추가
            if (userId) insertData.author_id = userId;

            console.log('공지 등록 시도:', insertData);

            const { data, error } = await supabase.from('notices').insert([insertData]).select();

            if (error) {
                console.error('공지 작성 에러:', error);
                window.alert('공지 등록 실패: ' + error.message + '\n(힌트: ' + (error.hint || error.details || 'N/A') + ')');
                return;
            }

            console.log('공지 등록 성공:', data);
            setTitle('');
            setContent('');
            setIsWriting(false);
            fetchNotices();
        } catch (err: any) {
            console.error('공지 작성 예외:', err);
            window.alert('공지 등록 예외: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    // 공지 삭제 (관리자만)
    const handleDeleteNotice = async (noticeId: string) => {
        setDeleteNoticeId(noticeId);
        try {
            const { error } = await supabase
                .from('notices')
                .delete()
                .eq('id', noticeId);

            if (error) {
                console.error('공지 삭제 에러:', error);
                return;
            }
            fetchNotices();
        } catch (err) {
            console.error('공지 삭제 예외:', err);
        } finally {
            setDeleteNoticeId(null);
        }
    };

    // 날짜 포맷
    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    return (
        <>
            <div
                className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            <div
                className={`fixed top-0 right-0 z-[70] w-[85%] max-w-md h-full bg-[#f8fafc] shadow-2xl transition-transform duration-300 ease-in-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="flex flex-col h-full">
                    {/* 헤더 */}
                    <div className="p-6 bg-white border-b border-slate-100 flex justify-between items-center shadow-sm">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-800 tracking-tight flex items-center gap-2">
                                <Bell size={20} className="text-emerald-600" />
                                공지사항
                            </h2>
                            <p className="text-[10px] text-emerald-600 font-medium mt-0.5 uppercase tracking-widest">Notice Board</p>
                        </div>
                        <button onClick={onClose} className="p-2.5 bg-slate-100 text-slate-500 rounded-full active:scale-90 transition-transform">
                            <X size={20} />
                        </button>
                    </div>

                    {/* 탭 */}
                    <div className="px-4 pt-3 bg-white border-b border-slate-100">
                        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                            <button
                                onClick={() => setActiveTab('notices')}
                                className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'notices' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
                            >
                                📢 공지사항
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab('requests');
                                    fetchRequests();
                                    if (userRole !== 'admin' && userRole !== 'owner') {
                                        localStorage.setItem('requests_last_seen', new Date().toISOString());
                                        onStatusChange?.();
                                    }
                                }}
                                className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'requests' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
                            >
                                📅 일정변경
                            </button>
                        </div>
                    </div>

                    {/* 본문 */}
                    {activeTab === 'notices' ? (
                        <>
                            {/* 공지 리스트 */}
                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                                {isLoading ? (
                                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-emerald-600" /></div>
                                ) : isWriting ? (
                                    /* 작성 폼 */
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 ml-1 mb-1 block">제목</label>
                                            <input
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                placeholder="공지 제목을 입력하세요"
                                                required
                                                className="w-full p-4 bg-white rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-slate-900 transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 ml-1 mb-1 block">내용</label>
                                            <textarea
                                                value={content}
                                                onChange={(e) => setContent(e.target.value)}
                                                placeholder="공지 내용을 입력하세요"
                                                required
                                                rows={6}
                                                className="w-full p-4 bg-white rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-900 transition-all resize-none"
                                            />
                                        </div>
                                        <div className="flex gap-3 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsWriting(false)}
                                                className="flex-1 py-3.5 font-bold text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                취소
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isSaving}
                                                className="flex-1 py-3.5 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                                            >
                                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} />}
                                                등록하기
                                            </button>
                                        </div>
                                    </form>
                                ) : notices.length > 0 ? (
                                    notices.map((notice: any) => (
                                        <div key={notice.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                                            {/* 제목 줄 (클릭 가능) */}
                                            <div
                                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                                                onClick={() => setExpandedId(expandedId === notice.id ? null : notice.id)}
                                            >
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    <ChevronDown
                                                        size={16}
                                                        className={`text-slate-400 shrink-0 transition-transform duration-200 ${expandedId === notice.id ? 'rotate-180' : ''}`}
                                                    />
                                                    <h3 className="font-bold text-slate-900 text-[15px] truncate">{notice.title}</h3>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                        {formatDate(notice.created_at)}
                                                    </span>
                                                    {(userRole === 'admin' || userRole === 'owner') && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(notice.id); }}
                                                            disabled={deleteNoticeId === notice.id}
                                                            className="text-slate-300 hover:text-red-500 transition-colors active:scale-90"
                                                        >
                                                            {deleteNoticeId === notice.id
                                                                ? <Loader2 size={14} className="animate-spin" />
                                                                : <Trash2 size={14} />}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* 내용 (CSS grid 트랜지션 아코디언) */}
                                            <div
                                                className="transition-[grid-template-rows] duration-200 ease-out"
                                                style={{ display: 'grid', gridTemplateRows: expandedId === notice.id ? '1fr' : '0fr' }}
                                            >
                                                <div className="overflow-hidden">
                                                    <div className="px-4 pb-4 pt-0">
                                                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line border-t border-slate-100 pt-3">{notice.content}</p>
                                                        {(userRole === 'admin' || userRole === 'owner') && (
                                                            <div className="mt-3 pt-2.5 border-t border-slate-100">
                                                                <div className="flex items-center gap-1 flex-wrap">
                                                                    <span className="text-[10px] font-bold text-slate-400">읽음:</span>
                                                                    {(readStatus[notice.id] || []).length > 0
                                                                        ? readStatus[notice.id].map((name, i) => (
                                                                            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-600 font-semibold rounded-md">{name}</span>
                                                                        ))
                                                                        : <span className="text-[10px] text-slate-300">없음</span>
                                                                    }
                                                                </div>
                                                                {allTeachers.filter(t => !(readStatus[notice.id] || []).includes(t.full_name)).length > 0 && (
                                                                    <div className="flex items-center gap-1 flex-wrap mt-1.5">
                                                                        <span className="text-[10px] font-bold text-red-400">읽지않음:</span>
                                                                        {allTeachers
                                                                            .filter(t => !(readStatus[notice.id] || []).includes(t.full_name))
                                                                            .map(t => (
                                                                                <span key={t.id} className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-400 font-semibold rounded-md">{t.full_name}</span>
                                                                            ))
                                                                        }
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-64 flex flex-col items-center justify-center text-slate-300 text-center">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                            <Bell size={30} strokeWidth={1.5} className="text-slate-200" />
                                        </div>
                                        <p className="font-medium text-slate-400">아직 공지사항이 없습니다.</p>
                                    </div>
                                )}
                            </div>

                            {/* 하단: 관리자 작성 버튼 */}
                            {(userRole === 'admin' || userRole === 'owner') && !isWriting && (
                                <div className="p-6 bg-white border-t border-slate-100 pb-10">
                                    <button
                                        onClick={() => setIsWriting(true)}
                                        className="w-full py-5 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 active:scale-95 transition-all text-lg font-bold"
                                    >
                                        <Plus size={22} strokeWidth={2.5} />
                                        <span>새 공지 작성</span>
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {/* 일정변경 요청 리스트 */}
                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                                {requestsLoading ? (
                                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-600" /></div>
                                ) : requests.length > 0 ? (
                                    requests.map((req: any) => (
                                        <div key={req.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <CalendarDays size={16} className="text-blue-500" />
                                                    <span className="font-bold text-slate-900 text-[14px]">{req.students?.name || '학생'}</span>
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
                                                        {req.request_type === 'reschedule' ? '일정 변경' : req.request_type === 'makeup' ? '보강 요청' : '수업 취소'}
                                                    </span>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${req.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                                                    req.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                                                        'bg-red-50 text-red-500'
                                                    }`}>
                                                    {req.status === 'pending' ? '대기중' : req.status === 'approved' ? '승인' : '거절'}
                                                </span>
                                            </div>
                                            <div className="text-[12px] text-slate-500 space-y-1">
                                                <p>요청자: <span className="font-semibold text-slate-700">{req.profiles?.full_name}</span></p>
                                                {req.schedule && <p>수업일시: <span className="font-semibold text-slate-700">{req.schedule.date} ({req.schedule.time?.substring(0, 5)})</span></p>}
                                                <p>변경희망일시: <span className="font-semibold text-blue-600">{req.requested_date} ({req.content?.match(/희망시간: (\d{2}:\d{2})/)?.[1] || ''})</span></p>
                                                {(() => { const m = req.content?.match(/사유: ([\s\S]+)/); return m ? <p>사유: <span className="font-semibold text-slate-700">{m[1]}</span></p> : null; })()}
                                                {req.status === 'rejected' && req.admin_comment && (
                                                    <p className="mt-1.5 px-2.5 py-1.5 bg-red-50 rounded-lg text-red-500 font-semibold">거절 사유: {req.admin_comment}</p>
                                                )}
                                            </div>
                                            {(userRole === 'admin' || userRole === 'owner') && (
                                                <div className="flex gap-2 mt-3 pt-2.5 border-t border-slate-100">
                                                    {req.status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleApprove(req)}
                                                                className="flex-1 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-[12px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-all hover:bg-emerald-100"
                                                            >
                                                                <Check size={14} /> 승인
                                                            </button>
                                                            <button
                                                                onClick={() => { setRejectTarget(req); setRejectReason(''); }}
                                                                className="flex-1 py-2 bg-red-50 text-red-500 rounded-lg text-[12px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-all hover:bg-red-100"
                                                            >
                                                                <XCircle size={14} /> 거절
                                                            </button>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteRequest(req.id)}
                                                        className="flex-1 py-2 bg-slate-50 text-slate-400 rounded-lg text-[12px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-all hover:bg-slate-100 hover:text-red-500"
                                                    >
                                                        <Trash2 size={14} /> 삭제
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-64 flex flex-col items-center justify-center text-slate-300 text-center">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                            <CalendarDays size={30} strokeWidth={1.5} className="text-slate-200" />
                                        </div>
                                        <p className="font-medium text-slate-400">일정변경 요청이 없습니다.</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
            {/* 삭제 확인 모달 */}
            {confirmDeleteId && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[80] p-6">
                    <div className="bg-white w-full max-w-sm rounded-2xl p-8 shadow-2xl text-center">
                        <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-5">
                            <Trash2 size={28} strokeWidth={2.5} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">공지 삭제</h3>
                        <p className="text-slate-500 text-sm font-medium mb-6">이 공지사항을 삭제하시겠습니까?</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="flex-1 py-3.5 font-bold text-slate-400 hover:text-slate-600 transition-colors rounded-xl"
                            >
                                취소
                            </button>
                            <button
                                onClick={() => {
                                    handleDeleteNotice(confirmDeleteId);
                                    setConfirmDeleteId(null);
                                }}
                                className="flex-1 py-3.5 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-100 hover:bg-red-600 active:scale-95 transition-all"
                            >
                                삭제하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* 거절 사유 입력 모달 */}
            {rejectTarget && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[80] p-6">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl">
                        <div className="bg-red-500 p-5 text-white">
                            <h3 className="text-lg font-bold">요청 거절</h3>
                            <p className="text-red-200 text-sm mt-1">
                                {rejectTarget.students?.name} · {rejectTarget.requested_date}
                            </p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-1.5 block">거절 사유</label>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="거절 사유를 입력하세요"
                                    rows={3}
                                    className="w-full p-3.5 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-slate-800 font-medium resize-none"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setRejectTarget(null)}
                                    className="flex-1 py-3.5 font-bold text-slate-400 hover:text-slate-600 transition-colors rounded-xl"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleRejectConfirm}
                                    className="flex-1 py-3.5 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-100 hover:bg-red-600 active:scale-95 transition-all"
                                >
                                    거절하기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
