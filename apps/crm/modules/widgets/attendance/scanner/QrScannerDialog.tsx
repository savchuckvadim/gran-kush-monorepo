"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Camera, Keyboard, XCircle, Loader2 } from "lucide-react";

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

import { useQrPreview, useQrScan, type QrPreviewResult } from "@/modules/entities/presence";

import { QrCameraScanner } from "./QrCameraScanner";
import { QrPreviewCard } from "./QrPreviewCard";
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

export function QrScannerDialog({ autoScanCode }: QrScannerDialogProps = {}) {
    const t = useTranslations("crm.attendance.scanner");

    const qrPreview = useQrPreview();
    const qrScan = useQrScan();

    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<ScanStep>("scan");
    const [tab, setTab] = useState<ScanTab>("camera");
    const [scannedCode, setScannedCode] = useState("");
    const [manualCode, setManualCode] = useState("");
    const [previewData, setPreviewData] = useState<QrPreviewResult | null>(null);
    const [scanResult, setScanResult] = useState<SchemaCheckInResultDto | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);

    // ── Обработка считанного кода ─────────────────────────────────────────────

    const handleCodeScanned = useCallback(
        async (code: string) => {
            const trimmed = code.trim();
            if (!trimmed) return;

            setValidationError(null);
            setScannedCode(trimmed);

            try {
                const preview = await qrPreview.mutateAsync(trimmed);
                if (!preview.valid) {
                    setValidationError(preview.error ?? t("scanError"));
                    return;
                }
                setPreviewData(preview);
                setStep("preview");
            } catch {
                setValidationError(t("scanError"));
            }
        },
        [qrPreview, t]
    );

    const handleManualSubmit = useCallback(() => {
        handleCodeScanned(manualCode);
    }, [handleCodeScanned, manualCode]);

    // ── Подтверждение: фактическая запись присутствия ─────────────────────────

    const handleConfirm = useCallback(async () => {
        try {
            const result = await qrScan.mutateAsync(scannedCode);
            setScanResult(result);
            setStep("result");
        } catch {
            // ошибка — видна через qrScan.isError
        }
    }, [qrScan, scannedCode]);

    // ── Сброс ─────────────────────────────────────────────────────────────────

    const handleReset = useCallback(() => {
        setStep("scan");
        setScannedCode("");
        setManualCode("");
        setPreviewData(null);
        setScanResult(null);
        setValidationError(null);
        qrPreview.reset();
        qrScan.reset();
    }, [qrPreview, qrScan]);

    const handleClose = useCallback(
        (isOpen: boolean) => {
            setOpen(isOpen);
            if (!isOpen) handleReset();
        },
        [handleReset]
    );

    // Option B: автоматическое открытие с предзаполненным кодом
    useEffect(() => {
        if (autoScanCode) {
            setOpen(true);
            setTab("manual");
            setManualCode(autoScanCode);
        }
    }, [autoScanCode]);

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
                    {step === "scan" && (
                        <DialogDescription>{t("description")}</DialogDescription>
                    )}
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
                                <QrCameraScanner onScan={handleCodeScanned} />
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
