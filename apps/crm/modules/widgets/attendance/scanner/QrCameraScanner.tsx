"use client";

import { useEffect, useRef, useState } from "react";

import type { Html5Qrcode } from "html5-qrcode";
import { AlertCircle, Camera } from "lucide-react";

interface QrCameraScannerProps {
    onScan: (code: string) => void;
}

/**
 * Компонент живого сканирования QR через камеру устройства.
 * Использует html5-qrcode (динамический импорт — только на клиенте).
 * Автоматически запускает заднюю камеру (facingMode: environment).
 */
export function QrCameraScanner({ onScan }: QrCameraScannerProps) {
    const [error, setError] = useState<string | null>(null);
    const [ready, setReady] = useState(false);

    // Стабильный ID для div-контейнера (уникальный на экземпляр)
    const [divId] = useState(() => `qr-cam-${Math.random().toString(36).slice(2, 9)}`);

    // Ref для актуального коллбека (избегаем перезапуска effect при смене onScan)
    const onScanRef = useRef(onScan);
    onScanRef.current = onScan;

    // Флаг: уже отсканировано (чтобы не дублировать вызов)
    const scannedRef = useRef(false);

    useEffect(() => {
        scannedRef.current = false;
        let scanner: Html5Qrcode | null = null;
        let stopped = false;
        const stopVideoTracks = () => {
            const host = document.getElementById(divId);
            const video = host?.querySelector("video") as HTMLVideoElement | null;
            const stream = video?.srcObject as MediaStream | null;
            stream?.getTracks().forEach((track) => track.stop());
            if (video) {
                video.srcObject = null;
            }
        };

        import("html5-qrcode")
            .then(({ Html5Qrcode }) => {
                if (stopped) return;

                scanner = new Html5Qrcode(divId);

                scanner
                    .start(
                        { facingMode: "environment" },
                        { fps: 10, qrbox: { width: 250, height: 250 } },
                        (decodedText: string) => {
                            if (scannedRef.current) return;
                            scannedRef.current = true;
                            onScanRef.current(decodedText);
                        },
                        () => {
                            /* игнорируем непрерывные ошибки кадра */
                        }
                    )
                    .then(() => {
                        if (!stopped) setReady(true);
                    })
                    .catch((err: Error) => {
                        setError(
                            err.message?.includes("Permission")
                                ? "Нет доступа к камере. Разрешите доступ в настройках браузера."
                                : `Ошибка камеры: ${err.message}`
                        );
                    });
            })
            .catch(() => {
                setError("Не удалось загрузить модуль камеры");
            });

        return () => {
            stopped = true;
            if (!scanner) {
                stopVideoTracks();
                return;
            }

            const clearScanner = () => {
                Promise.resolve(scanner?.clear?.())
                    .catch(() => {})
                    .finally(stopVideoTracks);
            };

            try {
                Promise.resolve(scanner.stop())
                    .catch(() => {})
                    .finally(clearScanner);
            } catch {
                clearScanner();
            }
        };
    }, [divId]);

    return (
        <div className="space-y-2">
            {/* Область камеры */}
            <div
                className={`relative overflow-hidden rounded-lg border bg-muted transition-opacity ${
                    ready ? "opacity-100" : "opacity-50"
                }`}
            >
                {!ready && !error && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Camera className="h-8 w-8 animate-pulse" />
                            <span className="text-sm">Инициализация камеры…</span>
                        </div>
                    </div>
                )}
                {/* html5-qrcode монтирует сюда */}
                <div id={divId} className="w-full" />
            </div>

            {/* Ошибка доступа к камере */}
            {error && (
                <div className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}
