'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import ScheduleView from '@/components/ScheduleView';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SchedulePage() {
    const [session, setSession] = useState<any>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        setIsHydrated(true);

        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);

            if (session) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, full_name')
                    .eq('id', session.user.id)
                    .single();

                if (profile) {
                    setUserRole(profile.role);
                    setUserName(profile.full_name);
                }
            }
            setLoading(false);
        };

        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (!isHydrated || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
                <Loader2 className="animate-spin text-emerald-600" size={40} />
            </div>
        );
    }

    if (!session) {
        window.location.href = '/login';
        return null;
    }

    return (
        <main className="h-[100dvh] bg-[#f8fafc] flex flex-col py-6 px-2 md:py-12 md:px-8 text-slate-900 font-sans">
            <div className="max-w-7xl mx-auto w-full flex flex-col flex-1 min-h-0">
                {/* 관리 페이지 스타일의 헤더 */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 px-4 gap-6 shrink-0">
                    <div className="flex items-start justify-between w-full md:w-auto md:justify-start md:gap-8">
                        <div>
                            <h1 className="text-4xl font-bold tracking-tighter text-slate-900 italic">
                                Weekly <span className="text-emerald-600">Schedule</span>
                            </h1>
                            <p className="text-slate-500 font-bold mt-1.5 flex items-center gap-1.5 px-1">
                                <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                {userRole === 'admin' || userRole === 'owner'
                                    ? '전체 선생님의 수업 일정을 확인합니다.'
                                    : userName
                                        ? `${userName} 선생님의 수업 일정을 확인합니다.`
                                        : '수업 일정을 확인합니다.'}
                            </p>
                        </div>
                        <Link href="/" className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 mt-1">
                            <ArrowLeft size={20} strokeWidth={3} />
                        </Link>
                    </div>
                </header>

                <div className="flex-1 px-1 flex flex-col min-h-0">
                    <ScheduleView userId={session.user.id} userRole={userRole} />
                </div>
            </div>
        </main>
    );
}
