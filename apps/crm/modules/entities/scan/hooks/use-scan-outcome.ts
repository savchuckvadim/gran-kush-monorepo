"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

import type { ScanHandlers, ScanReply } from "@/modules/shared/lib/scan";

import type { ScannedMember, ScannedProduct, ScanResolution } from "../api/scan.api";

/** Своя карточка сканера: стойка и действия с участником, списание и заказ для товара. */
export type ScanCard =
    | { kind: "member"; member: ScannedMember }
    | { kind: "product"; product: ScannedProduct };

/** `reply` — экран обработал код или код не годится; `card` — сканер показывает свою карточку. */
export type ScanOutcome = { reply: ScanReply } | { card: ScanCard };

/**
 * Разбор ответа API по обработчикам открытого экрана. Недействительный код участника и
 * неизвестный код — ответ с причиной (тексты стойки и сканера), до обработчиков не доходят.
 */
export function useScanOutcome() {
    const t = useTranslations("crm.scanner");
    const tDoor = useTranslations("crm.attendance.scanner");

    return useCallback(
        (result: ScanResolution, handlers: ScanHandlers | undefined): ScanOutcome => {
            if (result.kind === "member" && result.member) {
                const member = result.member;
                if (!member.valid) {
                    const reason = member.errorCode ? `errors.${member.errorCode}` : "scanError";
                    return { reply: { ok: false, message: tDoor(reason) } };
                }
                const reply = handlers?.member?.(member);
                return reply ? { reply } : { card: { kind: "member", member } };
            }
            if (result.kind === "product" && result.product) {
                const reply = handlers?.product?.(result.product);
                return reply ? { reply } : { card: { kind: "product", product: result.product } };
            }
            return {
                reply: { ok: false, message: t(`errors.${result.reason ?? "unrecognized"}`) },
            };
        },
        [t, tDoor]
    );
}
