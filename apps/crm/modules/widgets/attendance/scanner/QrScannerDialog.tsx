"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Camera, Keyboard, Loader2, XCircle } from "lucide-react";

import type { SchemaCheckInResultDto } from "@workspace/api-client/core";
import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import { type QrPreviewResult, useQrPreview, useQrScan } from "@/modules/entities/presence";
import { useLocalizedLink } from "@/modules/shared";

import { QrPreviewCard } from "./QrPreviewCard";
import { QrCameraScannerYudiel } from "./QrCameraScannerYudiel";
import { ScanResultCard } from "./ScanResultCard";

// ─── State machine ────────────────────────────────────────────────────────────

type ScanStep = "scan" | "preview" | "result";
type ScanTab = "camera" | "manual";

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Диалог сканирования QR-кода — 3-шаговый процесс:
 *
 * 1. SCAN    — камера или ввод вручную
 * 2. PREVIEW — показываем участника + предлагаемое действие (вход/выход)
 * 3. RESULT  — результат после подтверждения
 */
interface QrScannerDialogProps {
    /** Option B: если задан — диалог открывается автоматически с этим кодом */
    autoScanCode?: string;
}

function normalizeScannedPayload(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return trimmed;

    // If QR already contains CRM scan link, prefer extracting the `code` param.
    // Supports:
    // - /scan?code=ENC
    // - /scan?scan=ENC
    // - https://crm-host/scan?code=ENC
    // - /scan/ENC
    if (/\/scan\b/i.test(trimmed)) {
        // Query-string variant
        const match = trimmed.match(/[?&](code|scan)=([^&#]+)/i);
        if (match?.[2]) return decodeURIComponent(match[2]);

        // Path variant: /scan/<code>
        const pathMatch = trimmed.match(/\/scan\/([^/?#]+)/i);
        if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1]);
    }

    // If backend payload is stored as a URL in QR (e.g. ".../scan?code=..."),
    // extract the actual payload value from query params.
    try {
        const url = new URL(
            trimmed,
            typeof window !== "undefined" ? window.location.origin : undefined
        );
        return url.searchParams.get("code") ?? url.searchParams.get("scan") ?? trimmed;
    } catch {
        // not a valid URL, continue with regex fallback
    }

    // Fallback for cases where QR decoder returns something URL-like but URL() parsing fails.
    const match = trimmed.match(/[?&](code|scan)=([^&#]+)/i);
    if (match?.[2]) return decodeURIComponent(match[2]);

    return trimmed;
}

export function QrScannerDialog({ autoScanCode }: QrScannerDialogProps = {}) {
    const router = useRouter();
    const getLocalizedPath = useLocalizedLink();

    const resultRedirect = useCallback(() => {
        const resultRedirectLink = getLocalizedPath("/crm/attendance");

        router.push(resultRedirectLink);
    }, [getLocalizedPath, router]);
    const t = useTranslations("crm.attendance.scanner");

    const qrPreview = useQrPreview();
    const qrScan = useQrScan();

    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<ScanStep>("scan");
    const [tab, setTab] = useState<ScanTab>("camera");
    // Перезапускаем QrCameraScanner, если декод пришел "кривой" (например, обрезанный строкой)
    // и backend вернул невалидный QR.
    const [cameraRestartKey, setCameraRestartKey] = useState(0);
    const [scannedCode, setScannedCode] = useState("");
    const [manualCode, setManualCode] = useState("");
    const [previewData, setPreviewData] = useState<QrPreviewResult | null>(null);
    const [scanResult, setScanResult] = useState<SchemaCheckInResultDto | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [scanDebugMessage, setScanDebugMessage] = useState<string | null>(null);
    const autoScanConsumedRef = useRef<string | null>(null);

    // ── Обработка считанного кода ─────────────────────────────────────────────

    const handleCodeScanned = useCallback(
        async (code: string) => {
            const payload = normalizeScannedPayload(code);
            if (!payload) return;
            setScanDebugMessage(`QR пойман. Длина payload: ${payload.length}`);
            console.info("[QR] scanned", { raw: code, payload });

            // If QR contains a full/relative scan URL - redirect immediately.
            // This makes the UX clear and lets `/scan` route do token-based redirection.
            const trimmed = code.trim();
            const looksLikeScanUrl = /^https?:\/\//i.test(trimmed) || trimmed.startsWith("/");
            if (looksLikeScanUrl && /\/scan\b/i.test(trimmed)) {
                setScanDebugMessage("Обнаружена scan-ссылка. Выполняю переход...");
                console.info("[QR] redirecting to scan URL", { url: trimmed });
                window.location.replace(trimmed);
                return;
            }

            setValidationError(null);
            setScannedCode(payload);
            setScanDebugMessage("Проверяю QR на сервере...");

            try {
                const preview = await qrPreview.mutateAsync(payload);
                if (!preview.valid) {
                    setValidationError(preview.error ?? t("scanError"));
                    setScanDebugMessage("QR распознан, но backend вернул невалидный результат.");
                    // Разрешаем повторный скан текущего QR: перезапустим декодер.
                    setCameraRestartKey((v) => v + 1);
                    return;
                }
                setScanDebugMessage("QR валиден. Переход к подтверждению.");
                setPreviewData(preview);
                setStep("preview");
            } catch {
                setValidationError(t("scanError"));
                setScanDebugMessage("Ошибка при проверке QR. Смотри network/console.");
                setCameraRestartKey((v) => v + 1);
            }
        },
        [qrPreview, t]
    );

    const handleManualSubmit = useCallback(() => {
        handleCodeScanned(manualCode);
    }, [handleCodeScanned, manualCode]);

    const handleReset = useCallback(() => {
        setStep("scan");
        setScannedCode("");
        setManualCode("");
        setPreviewData(null);
        setScanResult(null);
        setValidationError(null);
        setScanDebugMessage(null);
        setCameraRestartKey((v) => v + 1);
        qrPreview.reset();
        qrScan.reset();
    }, [qrPreview, qrScan]);

    // ── Подтверждение: фактическая запись присутствия ─────────────────────────
    const handleConfirm = useCallback(async () => {
        try {
            const result = await qrScan.mutateAsync(scannedCode);
            setScanResult(result);
            setStep("result");

            // Закрываем диалог после подтверждения присутствия/отсутствия,
            // чтобы не оставлять пользователя внутри мастера сканирования.
            // Небольшая задержка дает секунду увидеть результат (вход/выход).
            window.setTimeout(() => {
                setOpen(false);
                handleReset();
                resultRedirect();
            }, 800);
        } catch {
            // ошибка — видна через qrScan.isError
        }
    }, [qrScan, scannedCode, handleReset, resultRedirect]);

    const handleClose = useCallback(
        (isOpen: boolean) => {
            setOpen(isOpen);
            if (!isOpen) {
                handleReset();
            }
        },
        [handleReset]
    );

    // Option B: автоматическое открытие с предзаполненным кодом
    useEffect(() => {
        if (autoScanCode && autoScanConsumedRef.current !== autoScanCode) {
            autoScanConsumedRef.current = autoScanCode;
            // Деферим setState, чтобы не вызывать обновления синхронно внутри эффекта.
            // И сразу запускаем preview, чтобы "скан" работал как ожидалось.
            setTimeout(() => {
                setOpen(true);
                setTab("manual");
                setManualCode(autoScanCode);
                void handleCodeScanned(autoScanCode);
            }, 0);
        }
    }, [autoScanCode, handleCodeScanned]);

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogTrigger asChild>
                <Button size="lg" className="gap-2">
                    <Camera className="h-5 w-5" />
                    {t("scanButton")}
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {step === "scan" && t("title")}
                        {step === "preview" && t("titlePreview")}
                        {step === "result" && t("titleResult")}
                    </DialogTitle>
                    {step === "scan" && <DialogDescription>{t("description")}</DialogDescription>}
                </DialogHeader>

                {/* ── Шаг 1: SCAN ─────────────────────────────────────────── */}
                {step === "scan" && (
                    <div className="space-y-3">
                        {/* Переключатель камера / ручной */}
                        <div className="flex gap-1 rounded-lg border bg-muted p-1">
                            <button
                                onClick={() => setTab("camera")}
                                className={cn(
                                    "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                                    tab === "camera"
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Camera className="h-4 w-4" />
                                {t("tabCamera")}
                            </button>
                            <button
                                onClick={() => setTab("manual")}
                                className={cn(
                                    "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                                    tab === "manual"
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Keyboard className="h-4 w-4" />
                                {t("tabManual")}
                            </button>
                        </div>

                        {/* Камера */}
                        {tab === "camera" && (
                            <>
                                <QrCameraScannerYudiel
                                    key={cameraRestartKey}
                                    onScan={handleCodeScanned}
                                />
                                {qrPreview.isPending && (
                                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {t("scanning")}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Ручной ввод */}
                        {tab === "manual" && (
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">
                                        {t("manualInput")}
                                    </label>
                                    <textarea
                                        value={manualCode}
                                        onChange={(e) => setManualCode(e.target.value)}
                                        placeholder={t("manualPlaceholder")}
                                        className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                        disabled={qrPreview.isPending}
                                    />
                                </div>
                                <Button
                                    onClick={handleManualSubmit}
                                    disabled={!manualCode.trim() || qrPreview.isPending}
                                    className="w-full"
                                >
                                    {qrPreview.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {t("scanning")}
                                        </>
                                    ) : (
                                        t("submitScan")
                                    )}
                                </Button>
                            </div>
                        )}

                        {/* Ошибка валидации */}
                        {validationError && (
                            <div className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                                <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                <span>{validationError}</span>
                            </div>
                        )}

                        {/* Технический статус сканирования (для отладки в поле) */}
                        {scanDebugMessage && (
                            <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                                {scanDebugMessage}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Шаг 2: PREVIEW ──────────────────────────────────────── */}
                {step === "preview" && previewData && (
                    <div className="space-y-3">
                        <QrPreviewCard
                            preview={previewData}
                            onConfirm={handleConfirm}
                            onCancel={handleReset}
                            isLoading={qrScan.isPending}
                        />
                        {qrScan.isError && (
                            <div className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                                <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                <span>{t("scanError")}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Шаг 3: RESULT ───────────────────────────────────────── */}
                {step === "result" && scanResult && (
                    <ScanResultCard result={scanResult} onReset={handleReset} />
                )}
            </DialogContent>
        </Dialog>
    );
}
