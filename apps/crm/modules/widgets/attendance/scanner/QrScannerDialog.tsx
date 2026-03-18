"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Camera, CheckCircle, Loader2, XCircle } from "lucide-react";

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

import { useQrScan } from "@/modules/entities/presence";

import { ScanResultCard } from "./ScanResultCard";

/**
 * Диалог сканирования QR-кода.
 *
 * 1. Открывает камеру для сканирования
 * 2. Или вводит код вручную
 * 3. После сканирования — показывает результат с подтверждением
 */
export function QrScannerDialog() {
    const t = useTranslations("crm.attendance.scanner");
    const qrScan = useQrScan();

    const [open, setOpen] = useState(false);
    const [manualCode, setManualCode] = useState("");
    const [scanResult, setScanResult] = useState<SchemaCheckInResultDto | null>(null);

    const handleScan = useCallback(
        async (code: string) => {
            if (!code.trim()) return;

            try {
                const result = await qrScan.mutateAsync(code.trim());
                setScanResult(result);
            } catch {
                // Ошибка обрабатывается в mutation state
            }
        },
        [qrScan]
    );

    const handleManualSubmit = useCallback(() => {
        handleScan(manualCode);
    }, [handleScan, manualCode]);

    const handleReset = useCallback(() => {
        setScanResult(null);
        setManualCode("");
        qrScan.reset();
    }, [qrScan]);

    const handleClose = useCallback(
        (isOpen: boolean) => {
            setOpen(isOpen);
            if (!isOpen) {
                handleReset();
            }
        },
        [handleReset]
    );

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
                    <DialogTitle>{t("title")}</DialogTitle>
                    <DialogDescription>{t("description")}</DialogDescription>
                </DialogHeader>

                {/* Результат сканирования */}
                {scanResult ? (
                    <ScanResultCard result={scanResult} onReset={handleReset} />
                ) : (
                    <div className="space-y-4">
                        {/* Ввод кода вручную */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t("manualInput")}</label>
                            <textarea
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                placeholder={t("manualPlaceholder")}
                                className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                disabled={qrScan.isPending}
                            />
                        </div>

                        {/* Ошибка */}
                        {qrScan.isError && (
                            <div className="flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                                <XCircle className="h-4 w-4 shrink-0" />
                                <span>{t("scanError")}</span>
                            </div>
                        )}

                        <Button
                            onClick={handleManualSubmit}
                            disabled={!manualCode.trim() || qrScan.isPending}
                            className="w-full"
                        >
                            {qrScan.isPending ? (
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
            </DialogContent>
        </Dialog>
    );
}
