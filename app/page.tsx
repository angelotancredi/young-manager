'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Calendar from '@/components/Calendar';
import Auth from '@/components/Auth';
import { UserPlus, Loader2, LogOut } from 'lucide-react';
import Link from 'next/link';

import Header from '@/components/Header';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getSessionAndRole() {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session) {
        // 💡 role과 함께 full_name도 가져옵니다!
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', session.user.id)
          .single();

        setUserRole(profile?.role || 'teacher');
        setUserName(profile?.full_name || '이름없음');
      }
      setLoading(false);
    }

    getSessionAndRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setUserRole(null);
        setUserName('');
      }
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
    <main className="min-h-screen bg-[#f8fafc] p-8 md:p-12 text-black font-sans">
      <div className="max-w-7xl mx-auto">
        <Header session={session} userRole={userRole} userName={userName} />

        <div className="grid grid-cols-1 gap-10">
          {/* 💡 Calendar에 현재 유저 정보와 권한을 넘겨줍니다. */}
          <Calendar userId={session.user.id} userRole={userRole} />
        </div>
      </div>
    </main>
  );
}
