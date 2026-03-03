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

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);

    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 3000);

    // 💡 onAuthStateChange 콜백은 동기적으로만 처리 (Supabase auth lock 충돌 방지)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth Event:", event, !!session);
      setSession(session);

      if (!session) {
        setUserRole(null);
        setUserName('');
      }

      setLoading(false);
      clearTimeout(timeoutId);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  // 💡 세션이 변경되면 프로필을 비동기로 별도 로드 (auth lock 충돌 없음)
  useEffect(() => {
    if (!session) return;

    const fetchProfile = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setUserRole(profile.role || 'teacher');
          setUserName(profile.full_name || '이름없음');
        }
      } catch (err) {
        console.error("Profile fetch error:", err);
      }
    };

    fetchProfile();
  }, [session]);

  // Hydration 이슈 방지: 클라이언트 마운트 전까지는 빈 화면 또는 로더 유지
  if (!isHydrated) return null;

  // 데이터를 불러오는 동안 보여줄 로딩 화면
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <Loader2 className="animate-spin text-emerald-600" size={40} />
    </div>
  );

  // 💡 세션(로그인 기록)이 없으면 로그인 컴포넌트만 보여줌
  if (!session) return <Auth />;

  // 💡 로그인 성공 시 보여줄 메인 대시보드
  return (
    <main className="min-h-screen bg-[#f8fafc] py-6 px-2 md:py-12 md:px-8 text-black font-sans">
      <div className="max-w-7xl mx-auto">
        <Header session={session} userRole={userRole} userName={userName} userId={session.user.id} />

        <div className="grid grid-cols-1 gap-10">
          {/* 💡 Calendar에 현재 유저 정보와 권한을 넘겨줍니다. */}
          <Calendar userId={session.user.id} userRole={userRole} />
        </div>
      </div>
    </main>
  );
}
