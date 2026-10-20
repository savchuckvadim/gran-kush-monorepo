"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

import {
    getApiErrorCode,
    newIdempotencyKey,
    type SchemaCheckInResultDto,
} from "@workspace/api-client/core";

import {
    type QrPreviewResult,
    useConfirmDoorScan,
    useQrPreview,
} from "@/modules/entities/presence";
import { normalizeScannedPayload } from "@/modules/entities/scan";

export type ScanStep = "scan" | "preview" | "result";

/** Подтверждение стойки: предпросмотр с ключом идемпотентности, затем вход или выход. */
interface PendingScan {
    code: string;
    preview: QrPreviewResult;
    idempotencyKey: string;
}

/**
 * Сценарий стойки: прочитать код → показать участника и предлагаемое действие → подтвердить.
 * Подтверждение отправляет именно то действие, что видел сотрудник, и ключ этого предпросмотра:
 * повторное нажатие не превращает вход в выход и не ставит вторую отметку.
 */
export function useDoorScan() {
    const t = useTranslations("crm.attendance.scanner");
    const preview = useQrPreview();
    const confirm = useConfirmDoorScan();

    const [step, setStep] = useState<ScanStep>("scan");
    const [pending, setPending] = useState<PendingScan | null>(null);
    const [result, setResult] = useState<SchemaCheckInResultDto | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);
    // камера перезапускается после неудачного кода, чтобы его можно было прочитать снова
    const [cameraKey, setCameraKey] = useState(0);

    const read = useCallback(
        async (raw: string) => {
            const code = normalizeScannedPayload(raw);
            if (!code) return;
            setScanError(null);
            try {
                const checked = await preview.mutateAsync(code);
                if (!checked.valid) {
                    setScanError(
                        checked.errorCode ? t(`errors.${checked.errorCode}`) : t("scanError")
                    );
                    setCameraKey((key) => key + 1);
                    return;
                }
                setPending({ code, preview: checked, idempotencyKey: newIdempotencyKey() });
                setStep("preview");
            } catch {
                setScanError(t("scanError"));
                setCameraKey((key) => key + 1);
            }
        },
        [preview, t]
    );

    const reset = useCallback(() => {
        setStep("scan");
        setPending(null);
        setResult(null);
        setScanError(null);
        setCameraKey((key) => key + 1);
        preview.reset();
        confirm.reset();
    }, [preview, confirm]);

    /** `true` — отметка записана (или уже была записана этим же предпросмотром). */
    const submit = useCallback(async (): Promise<boolean> => {
        if (!pending) return false;
        try {
            const recorded = await confirm.mutateAsync({
                body: { code: pending.code, action: pending.preview.proposedAction },
                idempotencyKey: pending.idempotencyKey,
            });
            setResult(recorded);
            setStep("result");
            return true;
        } catch {
            return false;
        }
    }, [confirm, pending]);

    // известный код отказа (например, not_present) — своими словами, остальное — общей ошибкой
    const confirmCode = getApiErrorCode(confirm.error);
    let confirmError: string | null = null;
    if (confirm.error) {
        confirmError =
            confirmCode && t.has(`errors.${confirmCode}`)
                ? t(`errors.${confirmCode}`)
                : t("scanError");
    }

    return {
        step,
        preview: pending?.preview ?? null,
        result,
        scanError,
        confirmError,
        cameraKey,
        isReading: preview.isPending,
        isConfirming: confirm.isPending,
        read,
        submit,
        reset,
    };
}
