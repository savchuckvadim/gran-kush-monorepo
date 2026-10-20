"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ScanQrCode } from "lucide-react";

import { Button, Input } from "@workspace/ui";

import {
    normalizeScannedPayload,
    ScanReplyNote,
    useResolveScan,
    useScanOutcome,
} from "@/modules/entities/scan";
import { type ScanHandlers, scannerStore,type ScanReply } from "@/modules/shared/lib/scan";

/**
 * Код в черновик: USB/Bluetooth-сканер печатает его в поле и жмёт Enter (Enter не отправляет
 * заказ), камера — общий сканер CRM, который отдаёт коды тем же обработчикам черновика.
 */
export function OrderScanBar({
    handlers,
    disabled,
}: {
    handlers: ScanHandlers;
    disabled?: boolean;
}) {
    const t = useTranslations("crm.orders.create.scan");
    const resolve = useResolveScan();
    const toOutcome = useScanOutcome();
    const [code, setCode] = useState("");
    const [reply, setReply] = useState<ScanReply | null>(null);

    const submit = async () => {
        const value = normalizeScannedPayload(code);
        if (!value) return;
        setCode("");
        try {
            const outcome = toOutcome(await resolve.mutateAsync(value), handlers);
            setReply("reply" in outcome ? outcome.reply : { ok: false, message: t("notForOrder") });
        } catch {
            setReply({ ok: false, message: t("failed") });
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                <Input
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        void submit();
                    }}
                    placeholder={t("placeholder")}
                    aria-label={t("label")}
                    autoComplete="off"
                    disabled={disabled || resolve.isPending}
                    className="font-mono placeholder:font-sans"
                />
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => scannerStore.open()}
                    aria-label={t("camera")}
                    title={t("camera")}
                >
                    <ScanQrCode aria-hidden="true" />
                    <span className="hidden sm:inline">{t("camera")}</span>
                </Button>
            </div>
            {reply && <ScanReplyNote reply={reply} />}
        </div>
    );
}
