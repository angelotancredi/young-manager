'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { GraduationCap, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);

    try {
      // Supabase를 통해 로그인을 시도합니다.
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('로그인 실패:', error.message);
        setIsLoading(false);
      } else {
        // 로그인 성공 시 메인 화면(대시보드)으로 이동합니다.
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      console.error('로그인 중 예외 발생:', err);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-2xl shadow-blue-100/50 border border-slate-100">
        <div className="flex flex-col items-center mb-10">
          <div className="p-4 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 mb-4">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Young Manager</h1>
          <p className="text-slate-400 mt-2 font-medium">스마트한 학원 관리의 시작</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">이메일 주소</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@academy.com"
              required
              className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white text-black"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white text-black"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg transition-all active:scale-[0.98] mt-2 flex justify-center items-center"
          >
            {isLoading ? <Loader2 className="animate-spin mr-2" /> : '로그인하기'}
          </button>
        </form>

        <div className="mt-10 text-center text-sm text-slate-400">
          계정이 없으신가요? <span className="text-indigo-600 font-bold underline cursor-pointer">관리자에게 문의</span>
        </div>
      </div>
    </div>
  );
}