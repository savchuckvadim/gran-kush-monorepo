"use client";

import { useTranslations } from "next-intl";

import { toast } from "sonner";

import { useRealtimeEvent } from "@/modules/shared/realtime";

import { useOperationText } from "./use-operation-text";

export interface FinishedOperation {
    operationId: string;
    kind: string;
}

/**
 * Тост на итог фоновой операции автора: «готово» с кнопкой к результату, «не удалось» с причиной.
 * Событие приходит только автору — фильтровать по получателю не нужно.
 */
export function useOperationToasts(onOpen?: (operation: FinishedOperation) => void): void {
    const t = useTranslations("common.operations");
    const text = useOperationText();

    useRealtimeEvent(["operation.finished", "operation.failed"], (event) => {
        if (event.name === "operation.finished") {
            const { operationId, kind } = event.payload;
            toast.success(t("finished", { kind: text.kind(kind) }), {
                action: onOpen
                    ? { label: t("open"), onClick: () => onOpen({ operationId, kind }) }
                    : undefined,
            });
            return;
        }
        if (event.name === "operation.failed") {
            const { kind, errorCode } = event.payload;
            toast.error(t("failed", { kind: text.kind(kind), reason: text.reason(errorCode) }));
        }
    });
}
