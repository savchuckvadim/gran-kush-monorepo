"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { getApiErrorCode } from "@workspace/api-client/core";

import {
    normalizeScannedPayload,
    type ScanCard,
    useResolveScan,
    useScanOutcome,
} from "@/modules/entities/scan";
import { scanRegistry,type ScanReply } from "@/modules/shared/lib/scan";

/**
 * Пауза камеры после кода, который экран уже обработал: этикетка ещё в кадре, и тот же код в
 * эту паузу не читается второй раз (иначе один скан добавил бы товар дважды).
 */
const RESCAN_PAUSE_MS = 1500;

/**
 * Сеанс сканера: код → API → обработчик открытого экрана (черновик заказа) или своя карточка
 * участника / товара. Ответ экрана показывается, а камера сама ждёт следующий код.
 */
export function useScanner() {
    const t = useTranslations("crm.scanner");
    const resolve = useResolveScan();
    const toOutcome = useScanOutcome();
    const [card, setCard] = useState<{ code: string; card: ScanCard } | null>(null);
    const [reply, setReply] = useState<ScanReply | null>(null);
    const [cameraKey, setCameraKey] = useState(0);
    const paused = useRef<{ code: string; until: number } | null>(null);
    const timer = useRef<number | undefined>(undefined);

    useEffect(() => () => window.clearTimeout(timer.current), []);

    const restartCamera = useCallback((after: number) => {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCameraKey((key) => key + 1), after);
    }, []);

    const read = useCallback(
        async (raw: string) => {
            const code = normalizeScannedPayload(raw);
            if (!code) return;
            const pause = paused.current;
            if (pause && pause.code === code && Date.now() < pause.until) {
                restartCamera(RESCAN_PAUSE_MS);
                return;
            }
            try {
                const outcome = toOutcome(await resolve.mutateAsync(code), scanRegistry.top());
                if ("card" in outcome) {
                    setReply(null);
                    setCard({ code, card: outcome.card });
                    return;
                }
                setReply(outcome.reply);
                paused.current = { code, until: Date.now() + RESCAN_PAUSE_MS };
            } catch (error) {
                const forbidden = getApiErrorCode(error) === "missing_permission";
                setReply({
                    ok: false,
                    message: t(forbidden ? "errors.forbidden" : "errors.failed"),
                });
            }
            restartCamera(RESCAN_PAUSE_MS);
        },
        [resolve, toOutcome, restartCamera, t]
    );

    const reset = useCallback(() => {
        setCard(null);
        setReply(null);
        resolve.reset();
        restartCamera(0);
    }, [resolve, restartCamera]);

    return {
        card: card?.card ?? null,
        code: card?.code ?? null,
        reply,
        cameraKey,
        reading: resolve.isPending,
        read,
        reset,
    };
}
