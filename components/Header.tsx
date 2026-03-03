'use client';

import { supabase } from '@/lib/supabase';
import { UserPlus, LogOut } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
    session: any;
    userRole: string | null;
}

export default function Header({ session, userRole }: HeaderProps) {
    return (
        <div className="flex justify-between items-center mb-4 px-4 mt-1">
            <div className="flex items-center gap-2">
                <img src="/icon.png" alt="Logo" className="w-9 h-9 object-contain drop-shadow-sm" />
                <div className="leading-tight">
                    <h1 className="text-xl font-bold text-slate-900 tracking-tighter">Young.심</h1>
                    <p className="text-slate-500 text-[9px] font-bold uppercase tracking-tighter -mt-0.5">
                        {userRole === 'admin' ? 'Admin Dashboard' : 'Teacher Panel'}
                    </p>
                </div>
            </div>

            <div className="flex gap-2 items-center">
                {/* 학생 관리 페이지 링크 - Admin 전용으로 표시할 수도 있지만 일단 유지 */}
                <Link href="/students" className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 shadow-sm flex items-center gap-1.5 text-xs transition-all active:scale-95">
                    <UserPlus size={16} className="text-indigo-600" />
                    <span>학생 관리</span>
                </Link>

                {/* 로그아웃 버튼 */}
                <button
                    onClick={() => supabase.auth.signOut()}
                    className="p-2 bg-white border border-slate-100 text-slate-300 hover:text-red-500 rounded-xl transition-colors shadow-sm active:scale-90"
                    title="로그아웃"
                >
                    <LogOut size={18} />
                </button>
            </div>
        </div>
    );
}
