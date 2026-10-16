"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Camera, XCircle } from "lucide-react";

import { Button, ModalDialog } from "@workspace/ui";

import { useLocalizedLink } from "@/modules/shared";

import { QrPreviewCard } from "./QrPreviewCard";
import { ScanInputStep } from "./scan-input-step";
import { ScanResultCard } from "./ScanResultCard";
import { useDoorScan } from "./use-door-scan";

const STEP_TITLE = { scan: "title", preview: "titlePreview", result: "titleResult" } as const;

/** Сколько показывать результат, прежде чем закрыть диалог и вернуться к присутствию. */
const RESULT_VISIBLE_MS = 800;

interface QrScannerDialogProps {
    /** Код из адреса (`/scan?code=…`): диалог открывается сам и сразу проверяет код */
    autoScanCode?: string;
    /** Открыт сразу (кнопка сканера в шапке); после закрытия страница убирает свой параметр */
    autoOpen?: boolean;
    onClosed?: () => void;
}

/**
 * Стойка клуба: прочитать QR → увидеть участника и предлагаемое действие → подтвердить вход
 * или выход (`useDoorScan`). После отметки диалог закрывается и открывает присутствие.
 */
export function QrScannerDialog({ autoScanCode, autoOpen, onClosed }: QrScannerDialogProps = {}) {
    const t = useTranslations("crm.attendance.scanner");
    const router = useRouter();
    const toLocalized = useLocalizedLink();
    const door = useDoorScan();
    const [open, setOpen] = useState(Boolean(autoOpen));
    const consumedCode = useRef<string | null>(null);

    // сброс — при открытии: при закрытии он показал бы первый шаг, пока диалог гаснет
    const close = (next: boolean) => {
        if (next) door.reset();
        setOpen(next);
        if (!next) onClosed?.();
    };

    const confirm = async () => {
        if (!(await door.submit())) return;
        window.setTimeout(() => {
            close(false);
            router.push(toLocalized("/crm/attendance"));
        }, RESULT_VISIBLE_MS);
    };

    useEffect(() => {
        if (!autoScanCode || consumedCode.current === autoScanCode) return;
        consumedCode.current = autoScanCode;
        // после отрисовки: setState прямо в эффекте запускал бы повторный рендер синхронно
        window.setTimeout(() => {
            setOpen(true);
            void door.read(autoScanCode);
        }, 0);
    }, [autoScanCode, door]);

    return (
        <ModalDialog
            open={open}
            onOpenChange={close}
            size="md"
            title={t(STEP_TITLE[door.step])}
            description={door.step === "scan" ? t("description") : undefined}
            trigger={
                <Button size="lg" className="gap-2">
                    <Camera className="h-5 w-5" />
                    {t("scanButton")}
                </Button>
            }
        >
            {door.step === "scan" && (
                <ScanInputStep
                    onRead={(code) => void door.read(code)}
                    reading={door.isReading}
                    error={door.scanError}
                    cameraKey={door.cameraKey}
                    initialCode={autoScanCode}
                />
            )}

            {door.step === "preview" && door.preview && (
                <div className="space-y-3">
                    <QrPreviewCard
                        preview={door.preview}
                        onConfirm={() => void confirm()}
                        onCancel={door.reset}
                        isLoading={door.isConfirming}
                    />
                    {door.confirmError && (
                        <div
                            role="alert"
                            className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
                        >
                            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{door.confirmError}</span>
                        </div>
                    )}
                </div>
            )}

            {door.step === "result" && door.result && (
                <ScanResultCard result={door.result} onReset={door.reset} />
            )}
        </ModalDialog>
    );
}
