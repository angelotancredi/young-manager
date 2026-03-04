'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, ArrowLeft, Search, UserCircle, Loader2, ShieldCheck, Mail, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import Link from 'next/link';
import AlertModal from '@/components/AlertModal';
import { useBackClose } from '@/hooks/useBackClose';
export default function TeacherManagement() {
    const [teachers, setTeachers] = useState<any[]>([]);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [alertMessage, setAlertMessage] = useState<{ title: string; message: string } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<any>(null);

    useBackClose(!!deleteTarget, () => setDeleteTarget(null));

    const fetchTeachers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('full_name', { ascending: true });

            if (error) {
                console.error('Fetch teachers error:', error);
                setTeachers([]);
            } else {
                setTeachers(data || []);
            }
        } catch (err) {
            console.error('fetchTeachers exception:', err);
            setTeachers([]);
        }
    };

    const fetchUserRole = async () => {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error || !user) return;

            const { data } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            setUserRole(data?.role || 'teacher');
        } catch (err) {
            console.error('fetchUserRole exception:', err);
        }
    };

    useEffect(() => {
        async function init() {
            setIsLoading(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    window.location.href = '/';
                    return;
                }
                await Promise.all([fetchTeachers(), fetchUserRole()]);
            } catch (err) {
                console.error('Teachers page init error:', err);
            } finally {
                setIsLoading(false);
            }
        }
        init();
    }, []);

    // 역할 전환
    const handleToggleRole = async (teacher: any) => {
        const newRole = teacher.role === 'admin' ? 'teacher' : 'admin';
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', teacher.id);

        if (!error) {
            setAlertMessage({ title: '역할 변경', message: `${teacher.full_name}님의 역할이\n${newRole === 'admin' ? '관리자' : '교사'}로 변경되었습니다.` });
            fetchTeachers();
        }
    };

    // 삭제
    const handleDelete = async () => {
        if (!deleteTarget) return;
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', deleteTarget.id);

        if (!error) {
            setAlertMessage({ title: '삭제 완료', message: `${deleteTarget.full_name}님이 삭제되었습니다.` });
            fetchTeachers();
        } else {
            setAlertMessage({ title: '삭제 실패', message: error.message });
        }
        setDeleteTarget(null);
    };

    // 활성/비활성 전환
    const handleToggleActive = async (teacher: any) => {
        const newActive = !teacher.is_active;
        const { error } = await supabase
            .from('profiles')
            .update({ is_active: newActive })
            .eq('id', teacher.id);

        if (!error) {
            setAlertMessage({ title: newActive ? '활성화' : '비활성화', message: `${teacher.full_name}님이 ${newActive ? '활성화' : '비활성화'}되었습니다.` });
            fetchTeachers();
        }
    };

    const filteredTeachers = teachers.filter(t =>
        (t.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const adminCount = teachers.filter(t => t.role === 'admin').length;
    const teacherCount = teachers.filter(t => t.role === 'teacher').length;
    const inactiveCount = teachers.filter(t => t.is_active === false).length;

    // 관리자 → 교사 → 비활성, 각 그룹 내 가나다순
    const sortedTeachers = [...filteredTeachers].sort((a, b) => {
        // 비활성은 항상 맨 뒤
        if (a.is_active === false && b.is_active !== false) return 1;
        if (a.is_active !== false && b.is_active === false) return -1;
        // 관리자 우선
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        // 가나다순
        return (a.full_name || '').localeCompare(b.full_name || '', 'ko');
    });

    return (
        <div className="h-[100dvh] bg-[#f8fafc] font-sans text-slate-900 flex flex-col py-6 px-2 md:py-12 md:px-8">
            <div className="max-w-7xl mx-auto w-full flex flex-col flex-1 min-h-0">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 px-4 gap-6 shrink-0">
                    <div className="flex items-start justify-between w-full md:w-auto md:justify-start md:gap-8">
                        <div>
                            <h1 className="text-4xl font-bold tracking-tighter text-slate-900 italic">
                                Teacher <span className="text-blue-600">List</span>
                            </h1>
                            <p className="text-slate-500 font-bold mt-1.5 flex items-center gap-1.5 px-1">
                                <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                전체 {teachers.length}명 (관리자 {adminCount} · 교사 {teacherCount}{inactiveCount > 0 ? ` · 비활성 ${inactiveCount}` : ''})
                            </p>
                        </div>
                        <Link href="/" className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 mt-1">
                            <ArrowLeft size={20} strokeWidth={3} />
                        </Link>
                    </div>
                </header>

                <div className="px-4 flex flex-col flex-1 min-h-0">
                    {/* 검색 바 */}
                    <div className="relative mb-8 group shrink-0">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="이름 또는 이메일로 찾기..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder:text-slate-300"
                        />
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center p-20 shrink-0"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
                    ) : (
                        <div className="flex-1 overflow-y-auto pb-10 -mx-2 px-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {sortedTeachers.map((teacher) => (
                                    <div key={teacher.id} className={`bg-white py-4 px-5 rounded-3xl border shadow-sm hover:shadow-md transition-all group relative overflow-hidden ${teacher.is_active === false ? 'opacity-50 border-slate-200 bg-slate-50' : 'border-slate-100 hover:border-blue-100'}`}>
                                        <div className="flex items-center gap-4">
                                            {/* 아바타 */}
                                            <div className={`p-2.5 rounded-2xl shadow-sm ${teacher.is_active === false ? 'bg-slate-100 text-slate-400' : teacher.role === 'admin' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                                {teacher.role === 'admin' ? <ShieldCheck size={28} /> : <UserCircle size={28} />}
                                            </div>
                                            {/* 정보 */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-xl font-bold text-slate-800 truncate">{teacher.full_name || '이름 없음'}</h3>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${teacher.role === 'admin' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                                        {teacher.role === 'admin' ? '관리자' : '교사'}
                                                    </span>
                                                    {teacher.is_active === false && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-500">비활성</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-1 text-slate-400">
                                                    <Mail size={12} />
                                                    <span className="text-xs font-medium truncate">{teacher.email || '-'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 하단 액션 버튼 */}
                                        {userRole === 'admin' && (
                                            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                                                <button
                                                    onClick={() => handleToggleRole(teacher)}
                                                    className={`flex-1 py-2 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all ${teacher.role === 'admin'
                                                        ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                                        }`}
                                                >
                                                    {teacher.role === 'admin' ? <><ToggleRight size={14} /> 교사로 변경</> : <><ToggleLeft size={14} /> 관리자로 변경</>}
                                                </button>
                                                <button
                                                    onClick={() => handleToggleActive(teacher)}
                                                    className={`flex-1 py-2 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all ${teacher.is_active === false
                                                        ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                                        : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                                        }`}
                                                >
                                                    {teacher.is_active === false ? '활성화' : '비활성화'}
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(teacher)}
                                                    className="py-2 px-3 bg-slate-50 text-slate-400 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-all hover:bg-red-50 hover:text-red-500"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {filteredTeachers.length === 0 && (
                                    <div className="col-span-full py-20 text-center">
                                        <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-50 rounded-3xl mb-4">
                                            <Search size={24} className="text-slate-300" />
                                        </div>
                                        <p className="text-slate-400 font-bold">등록된 선생님이 없습니다.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 삭제 확인 모달 */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[80] p-6">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 text-center shadow-2xl">
                        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={28} className="text-red-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">선생님 삭제</h3>
                        <p className="text-slate-500 text-sm font-medium mb-6">
                            <span className="font-bold text-slate-700">{deleteTarget.full_name}</span>님을<br />정말 삭제하시겠습니까?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 py-3.5 font-bold text-slate-400 hover:text-slate-600 transition-colors rounded-xl"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 py-3.5 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-100 hover:bg-red-600 active:scale-95 transition-all"
                            >
                                삭제하기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AlertModal
                isOpen={!!alertMessage}
                onClose={() => setAlertMessage(null)}
                title={alertMessage?.title || ''}
                message={alertMessage?.message || ''}
            />
        </div>
    );
}
