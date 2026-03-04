'use client';

import { supabase } from '@/lib/supabase';
import { LogOut, ShieldCheck, UserCircle, UserPlus, Bell } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AlertModal from './AlertModal';
import NoticePanel from './NoticePanel';
import { useState, useEffect, useCallback } from 'react';

interface HeaderProps {
    session: any;
    userRole: string | null;
    userName?: string;
    userId?: string;
}

export default function Header({ session, userRole, userName, userId }: HeaderProps) {
    const router = useRouter();
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [isNoticeOpen, setIsNoticeOpen] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);

    // 미읽음 공지 체크
    const checkUnread = useCallback(async () => {
        if (!userId) return;
        try {
            // 전체 공지 수
            const { count: totalCount } = await supabase
                .from('notices')
                .select('*', { count: 'exact', head: true });

            // 내가 읽은 공지 수
            const { count: readCount } = await supabase
                .from('notice_reads')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            const hasUnreadNotices = (totalCount || 0) > (readCount || 0);

            // 관리자: pending 요청 체크
            let hasPendingRequests = false;
            if (userRole === 'admin') {
                const { count: pendingCount } = await supabase
                    .from('schedule_requests')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'pending');
                hasPendingRequests = (pendingCount || 0) > 0;
            }

            setHasUnread(hasUnreadNotices || hasPendingRequests);
        } catch (err) {
            console.error('Unread check error:', err);
        }
    }, [userId, userRole]);

    useEffect(() => {
        checkUnread();
    }, [checkUnread]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.reload();
    };

    const handleStudentManagementClick = (e: React.MouseEvent) => {
        if (userRole !== 'admin') {
            e.preventDefault();
            setIsAlertOpen(true);
        }
    };

    return (
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 px-4 gap-6">
            <div className="flex-shrink-0 flex items-center justify-between w-full md:w-auto">
                <h1 className="text-4xl font-bold text-slate-900 tracking-tighter italic">
                    Young.심 <span className="text-emerald-600">Manager</span>
                </h1>
                <button
                    onClick={() => setIsNoticeOpen(true)}
                    className="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all active:scale-90 relative"
                >
                    <Bell size={26} strokeWidth={2.2} className={hasUnread ? 'bell-wiggle' : ''} />
                    {hasUnread && (
                        <span className="absolute top-1.5 right-1.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
                    )}
                </button>
            </div>

            <div className="flex flex-col items-end gap-3 w-full md:w-auto flex-1">
                {/* 💡 로그인 정보 표시줄 및 로그아웃 버튼 (우측 정렬) */}
                {session && (
                    <div className="flex items-center gap-2">
                        {/* 접속 정보 배지 */}
                        <div className="flex items-center gap-2 bg-slate-100/50 px-3 py-1.5 rounded-full border border-slate-200">
                            {userRole === 'admin' ? (
                                <ShieldCheck size={14} className="text-emerald-600" />
                            ) : (
                                <UserCircle size={14} className="text-slate-500" />
                            )}
                            <span className="text-xs font-bold text-slate-600">
                                <span className="text-emerald-700 font-bold">{userName}</span>
                                {userRole === 'admin' ? ' 원장님' : ' 선생님'}으로 접속 중
                            </span>
                        </div>

                        {/* 로그아웃 버튼 */}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-1.5 bg-slate-100/50 px-3 py-1.5 rounded-full border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-200/50 transition-all active:scale-95"
                        >
                            <LogOut size={12} />
                            로그아웃
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    {userRole === 'admin' ? (
                        <Link
                            href="/students"
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-2xl font-bold text-sm shadow-sm hover:bg-slate-50 transition-all border border-slate-100 active:scale-95"
                        >
                            <UserPlus size={18} className="text-emerald-600" />
                            학생 관리
                        </Link>
                    ) : (
                        <div className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50/50 text-emerald-600 rounded-2xl font-bold text-sm border border-emerald-100/50 cursor-default whitespace-nowrap">
                            오늘도 좋은 하루 보내세요~ 😊
                        </div>
                    )}
                </div>
            </div>

            <AlertModal
                isOpen={isAlertOpen}
                onClose={() => setIsAlertOpen(false)}
                message={`학생 관리는 관리자(원장님) 계정으로만\n접근 가능합니다.`}
            />

            <NoticePanel
                isOpen={isNoticeOpen}
                onClose={() => {
                    setIsNoticeOpen(false);
                    checkUnread();
                }}
                userRole={userRole}
                userId={userId}
                onStatusChange={checkUnread}
            />
        </header>
    );
}
