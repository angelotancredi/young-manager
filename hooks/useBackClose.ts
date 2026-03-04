'use client';

import { useEffect, useRef } from 'react';

/**
 * 모달/슬라이드가 열려있을 때 브라우저 뒤로가기 버튼으로 닫기
 * @param isOpen - 모달 열림 상태
 * @param onClose - 닫기 함수
 */
export function useBackClose(isOpen: boolean, onClose: () => void) {
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) return;

        const hash = `modal-${Math.random().toString(36).substr(2, 9)}`;
        window.history.pushState({ hash }, '');

        const handlePopState = () => {
            onCloseRef.current();
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            // UI의 X 버튼 등으로 닫혀서 popstate가 발생하지 않았을 경우
            // 강제로 쌓인 history를 한 칸 제거 (popstate 시동 방지)
            if (window.history.state?.hash === hash) {
                window.history.back();
            }
        };
    }, [isOpen]);
}
