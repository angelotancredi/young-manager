import Calendar from '@/components/Calendar';
import { Bell, UserCircle, UserPlus } from 'lucide-react'; // UserPlus 아이콘 추가
import Link from 'next/link'; // 페이지 이동을 위해 꼭 필요함!

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f8fafc] p-4 md:p-8 text-black">
      <div className="max-w-6xl mx-auto">

        {/* --- 여기부터 상단 바 (수정됨) --- */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Young Manager</h1>
            <p className="text-slate-500 font-medium">오늘도 힘찬 수업 되세요!</p>
          </div>

          <div className="flex gap-4 items-center">
            {/* 💡 새로 추가된 학생 관리 버튼 */}
            <Link
              href="/students"
              className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
            >
              <UserPlus size={18} className="text-indigo-600" />
              <span>학생 관리</span>
            </Link>

            {/* 기존 알림 및 프로필 (구분선 추가) */}
            <div className="h-8 w-[1px] bg-slate-200 mx-2" />

            <button className="relative p-2 text-slate-400 hover:text-indigo-600 transition">
              <Bell size={24} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-sm font-bold text-slate-700">원장님</span>
              <UserCircle size={35} className="text-slate-300" />
            </div>
          </div>
        </div>
        {/* --- 상단 바 끝 --- */}

        {/* 달력 컴포넌트 */}
        <Calendar />
      </div>
    </main>
  );
}