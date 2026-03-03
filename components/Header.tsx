'use client';

import { supabase } from '@/lib/supabase';
import { LogOut, ShieldCheck, UserCircle, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AlertModal from './AlertModal';
import { useState } from 'react';

interface HeaderProps {
    session: any;
    userRole: string | null;
    userName?: string;
}

export default function Header({ session, userRole, userName }: HeaderProps) {
    const router = useRouter();
    const [isAlertOpen, setIsAlertOpen] = useState(false);

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
            <div>
                <h1 className="text-4xl font-bold text-slate-900 tracking-tighter italic">
                    Young.심 <span className="text-emerald-600">Manager</span>
                </h1>
                {/* 💡 로그인 정보 표시줄 */}
                {session && (
                    <div className="flex items-center gap-2 mt-2 bg-slate-100/50 px-3 py-1.5 rounded-full border border-slate-200 w-fit">
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
                )}
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
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

                <button
                    onClick={handleLogout}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
                >
                    <LogOut size={18} />
                    Logout
                </button>
            </div>

            <AlertModal
                isOpen={isAlertOpen}
                onClose={() => setIsAlertOpen(false)}
                message={`학생 관리는 관리자(원장님) 계정으로만\n접근 가능합니다.`}
            />
        </header>
    );
}
