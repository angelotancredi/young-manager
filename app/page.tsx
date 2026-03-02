'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Calendar from '@/components/Calendar';
import Auth from '@/components/Auth';
import { UserPlus, Loader2, LogOut } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. 현재 로그인된 정보가 있는지 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. 로그인/로그아웃 상태가 변할 때마다 자동으로 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 데이터를 불러오는 동안 보여줄 로딩 화면
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <Loader2 className="animate-spin text-indigo-600" size={40} />
    </div>
  );

  // 💡 세션(로그인 기록)이 없으면 로그인 컴포넌트만 보여줌
  if (!session) return <Auth />;

  // 💡 로그인 성공 시 보여줄 메인 대시보드
  return (
    <main className="min-h-screen bg-[#f8fafc] p-4 md:p-8 text-black font-sans">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 영역 */}
        <div className="flex justify-between items-center mb-8 px-2 mt-2">
          <div className="flex items-center gap-3">
            <img src="/icon.png" alt="Logo" className="w-10 h-10 object-contain drop-shadow-sm" />
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight italic">Young.심</h1>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-tighter">Admin Dashboard</p>
            </div>
          </div>

          <div className="flex gap-3 items-center">
            {/* 학생 관리 페이지 링크 */}
            <Link href="/students" className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 shadow-sm flex items-center gap-2 text-sm transition-all active:scale-95">
              <UserPlus size={18} className="text-indigo-600" />
              <span>학생 관리</span>
            </Link>

            {/* 로그아웃 버튼 */}
            <button
              onClick={() => supabase.auth.signOut()}
              className="p-2.5 bg-white border border-slate-100 text-slate-300 hover:text-red-500 rounded-xl transition-colors shadow-sm active:scale-90"
              title="로그아웃"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* 메인 달력 컴포넌트 */}
        <Calendar />
      </div>
    </main>
  );
}