'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Lock, Mail } from 'lucide-react';
import Link from 'next/link';

export default function Auth() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            alert('로그인 실패: ' + error.message);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6">
            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/60 p-10 border border-slate-100 font-sans">
                <div className="text-center mb-10">
                    <div className="w-20 h-20 flex items-center justify-center mx-auto mb-4 scale-110 drop-shadow-sm">
                        <img src="/icon.png" alt="Young Manager Logo" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Young.심리발달센터</h1>
                    <p className="text-slate-400 font-bold mt-2 text-sm uppercase tracking-widest text-black">Admin Login</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 ml-1 uppercase">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                            <input
                                type="email"
                                placeholder="이메일을 입력하세요"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-700"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 ml-1 uppercase">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                            <input
                                type="password"
                                placeholder="비밀번호를 입력하세요"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-700"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-bold text-lg shadow-xl shadow-indigo-100 mt-6 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={24} /> : '로그인하기'}
                    </button>
                </form>

                <p className="text-center mt-8 text-slate-400 text-sm font-medium">
                    처음이신가요?{' '}
                    <Link href="/signup" className="text-indigo-600 font-bold underline underline-offset-4 hover:text-indigo-700 transition-colors">
                        선생님 등록하기
                    </Link>
                </p>
            </div>
        </div>
    );
}
