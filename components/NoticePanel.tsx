'use client';

import React, { useState, useEffect } from 'react';
import { X, Bell, Plus, Send, Loader2, Trash2, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface NoticePanelProps {
    isOpen: boolean;
    onClose: () => void;
    userRole: string | null;
    userId?: string;
}

export default function NoticePanel({ isOpen, onClose, userRole, userId }: NoticePanelProps) {
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
            if (userRole === 'admin' && list.length > 0) {
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
        if (userRole !== 'admin' || noticeIds.length === 0) return;
        try {
            // 1. 교사 목록 먼저 가져오기
            const { data: teachers } = await supabase
                .from('profiles')
                .select('id, full_name')
                .eq('role', 'teacher');
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
                if (!map[r.notice_id]) map[r.notice_id] = [];
                const name = teacherMap.get(r.user_id) || '미상';
                map[r.notice_id].push(name);
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
                                            {userRole === 'admin' && (
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
                                                {userRole === 'admin' && (
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
                    {userRole === 'admin' && !isWriting && (
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
        </>
    );
}
