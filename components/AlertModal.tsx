'use client';

import React from 'react';
import { ShieldAlert, X } from 'lucide-react';

interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message: string;
}

export default function AlertModal({ isOpen, onClose, title = "접근 제한", message }: AlertModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-[100] animate-in fade-in duration-200">
            <div
                className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative overflow-hidden animate-in zoom-in duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 상단 디자인 요소 */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500"></div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-300 hover:text-slate-500 hover:bg-slate-50 rounded-full transition-all"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-5 shadow-sm">
                        <ShieldAlert size={32} strokeWidth={2.5} />
                    </div>

                    <h2 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">
                        {title}
                    </h2>

                    <p className="text-slate-500 font-medium leading-relaxed mb-8 whitespace-pre-line">
                        {message}
                    </p>

                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 active:scale-95 transition-all shadow-lg shadow-slate-200"
                    >
                        확인했습니다
                    </button>
                </div>
            </div>

            {/* 배경 클릭 시 닫기 */}
            <div className="absolute inset-0 -z-10" onClick={onClose}></div>
        </div>
    );
}
