"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

/** Виды операций, которые клиент умеет назвать; новее клиента — «фоновая задача». */
const KNOWN_KINDS: ReadonlySet<string> = new Set<string>([]);

/** Причины сбоя механизма; код доменной ошибки исполнителя без перевода — «не удалось». */
const KNOWN_REASONS: ReadonlySet<string> = new Set([
    "operation_failed",
    "operation_runner_missing",
    "operation_queue_unavailable",
]);

/** Название вида операции и причины сбоя на языке интерфейса — `common.operations.*`. */
export function useOperationText(): {
    kind: (kind: string) => string;
    reason: (code: string | null) => string;
} {
    const t = useTranslations("common.operations");

    return useMemo(
        () => ({
            kind: (kind: string) => (KNOWN_KINDS.has(kind) ? t(`kinds.${kind}`) : t("kinds.unknown")),
            reason: (code: string | null) =>
                code && KNOWN_REASONS.has(code) ? t(`reasons.${code}`) : t("reasons.unknown"),
        }),
        [t]
    );
}
