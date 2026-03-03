'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Loader2, User, Mail, Lock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SignUp() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState(''); // 선생님 성함

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // 💡 가입할 때 'full_name'을 함께 저장합니다.
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });

        if (error) {
            alert('가입 실패: ' + error.message);
        } else {
            // 💡 핵심: 가입 성공 직후 강제로 로그아웃시켜서 자동 로그인을 막습니다.
            await supabase.auth.signOut();
            alert('회원가입 신청이 완료되었습니다! 이제 로그인 페이지에서 로그인해 주세요.');
            router.push('/'); // 로그인 페이지로 이동
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6 font-sans">
            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/60 p-10 border border-slate-100">
                <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors mb-6 text-sm font-bold uppercase tracking-widest">
                    <ArrowLeft size={16} />
                    Back to Login
                </Link>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Teacher Join</h1>
                    <p className="text-slate-400 font-bold mt-2 text-sm">영.심리발달센터 선생님으로 등록합니다.</p>
                </div>

                <form onSubmit={handleSignUp} className="space-y-4">
                    {/* 이름 입력 */}
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 ml-1 uppercase">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                            <input
                                type="text"
                                placeholder="이름을 입력하세요"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-700"
                                required
                            />
                        </div>
                    </div>

                    {/* 이메일 입력 */}
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

                    {/* 비밀번호 입력 */}
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 ml-1 uppercase">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                            <input
                                type="password"
                                placeholder="비밀번호(6자 이상)"
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
                        className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-slate-200 mt-6 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={24} /> : '가입 신청하기'}
                    </button>
                </form>
            </div>
        </div>
    );
}