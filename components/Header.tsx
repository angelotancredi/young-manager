'use client';

import { supabase } from '@/lib/supabase';
import { LogOut, ShieldCheck, UserCircle, UserPlus } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
    session: any;
    userRole: string | null;
    userName?: string;
}

export default function Header({ session, userRole, userName }: HeaderProps) {
    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.reload();
    };

    return (
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 px-4 gap-6">
            <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic">
                    Young <span className="text-emerald-600">Manager</span>
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
                            <span className="text-emerald-700 font-black">{userName}</span>
                            {userRole === 'admin' ? ' 원장님' : ' 선생님'}으로 접속 중
                        </span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
                {/* 학생 관리 페이지 링크 유지 */}
                <Link href="/students" className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-2xl font-black text-sm shadow-sm hover:bg-slate-50 transition-all border border-slate-100 active:scale-95">
                    <UserPlus size={18} className="text-emerald-600" />
                    학생 관리
                </Link>

                <button
                    onClick={handleLogout}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
                >
                    <LogOut size={18} />
                    Logout
                </button>
            </div>
        </header>
    );
}
