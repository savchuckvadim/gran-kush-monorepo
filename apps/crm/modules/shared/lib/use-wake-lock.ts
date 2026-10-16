"use client";

import { useEffect } from "react";

/**
 * Экран не гаснет, пока `active`: участник держит телефон с QR в очереди к стойке, а телефон гасит
 * экран раньше, чем дойдёт очередь. Браузер снимает блокировку, когда вкладка уходит в фон, —
 * при возвращении она берётся снова. Нет API (старые браузеры) или браузер отказал — экран гаснет
 * как обычно, страница работает.
 */
export function useWakeLock(active: boolean): void {
    useEffect(() => {
        if (!active || !("wakeLock" in navigator)) return;
        let lock: WakeLockSentinel | null = null;
        let stopped = false;

        const acquire = async () => {
            if (document.visibilityState !== "visible" || (lock && !lock.released)) return;
            try {
                const next = await navigator.wakeLock.request("screen");
                if (stopped) {
                    await next.release();
                    return;
                }
                lock = next;
            } catch {
                // энергосбережение или политика браузера: без блокировки, это не ошибка страницы
            }
        };
        const onVisibility = () => void acquire();

        void acquire();
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            stopped = true;
            document.removeEventListener("visibilitychange", onVisibility);
            lock?.release().catch(() => undefined);
        };
    }, [active]);
}
