"use client";

import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

import { AlertCircle, Camera } from "lucide-react";

interface QrCameraScannerYudielProps {
    onScan: (code: string) => void;
}

type ScannerLikeResult = {
    rawValue?: string;
} | null;

const DynamicScanner = dynamic(
    () =>
        import("@yudiel/react-qr-scanner").then((mod) => ({
            default: mod.Scanner,
        })),
    { ssr: false }
);

function extractCode(result: unknown): string | null {
    if (!result) return null;

    if (typeof result === "string") {
        return result.trim() || null;
    }

    if (Array.isArray(result)) {
        const first = (result[0] ?? null) as ScannerLikeResult;
        if (first && typeof first.rawValue === "string") {
            return first.rawValue.trim() || null;
        }
        return null;
    }

    const one = result as ScannerLikeResult;
    if (one && typeof one.rawValue === "string") {
        return one.rawValue.trim() || null;
    }

    return null;
}

/**
 * Альтернативный сканер на @yudiel/react-qr-scanner.
 * Загружается только на клиенте (dynamic import, ssr: false).
 */
export function QrCameraScannerYudiel({ onScan }: QrCameraScannerYudielProps) {
    const [error, setError] = useState<string | null>(null);
    const [ready, setReady] = useState(false);
    const scannedRef = useRef(false);

    const constraints = useMemo<MediaTrackConstraints>(
        () => ({ facingMode: { ideal: "environment" } }),
        []
    );

    return (
        <div className="space-y-2">
            <div
                className={`relative overflow-hidden rounded-lg border bg-muted transition-opacity ${
                    ready ? "opacity-100" : "opacity-50"
                }`}
            >
                {!ready && !error && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Camera className="h-8 w-8 animate-pulse" />
                            <span className="text-sm">Инициализация камеры…</span>
                        </div>
                    </div>
                )}

                <DynamicScanner
                    constraints={constraints}
                    scanDelay={300}
                    onScan={(result) => {
                        const code = extractCode(result);
                        if (!code || scannedRef.current) return;
                        scannedRef.current = true;
                        onScan(code);
                    }}
                    onError={(err) => {
                        const message =
                            err instanceof Error ? err.message : "Ошибка доступа к камере";
                        setError(
                            message.includes("Permission")
                                ? "Нет доступа к камере. Разрешите доступ в настройках браузера."
                                : `Ошибка камеры: ${message}`
                        );
                    }}
                    onLoad={() => {
                        setReady(true);
                    }}
                    styles={{
                        container: { width: "100%" },
                        video: { width: "100%", borderRadius: 8 },
                    }}
                />
            </div>

            {error && (
                <div className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}
