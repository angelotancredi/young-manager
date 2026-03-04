'use client';

import { useEffect } from 'react';

/**
 * 모달/슬라이드가 열려있을 때 브라우저 뒤로가기 버튼으로 닫기
 * @param isOpen - 모달 열림 상태
 * @param onClose - 닫기 함수
 */
export function useBackClose(isOpen: boolean, onClose: () => void) {
    useEffect(() => {
        if (!isOpen) return;

        // 모달이 열릴 때 history에 상태 추가
        window.history.pushState({ modal: true }, '');

        const handlePopState = () => {
            onClose();
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [isOpen, onClose]);
}
