"use client";

import { useTranslations } from "next-intl";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { type Operation, useOperation } from "@/modules/entities/operation";

import { useOperationText } from "./use-operation-text";

interface OperationStatusProps {
    /** id из ответа 202; `null` — операция ещё не запущена, компонент пуст */
    operationId: string | null;
    /** Как показать результат: ссылка на файл, сводка; без него — просто «готово» */
    renderResult?: (result: NonNullable<Operation["result"]>) => ReactNode;
}

/**
 * Состояние фоновой операции под кнопкой, которая её запустила: идёт — спиннер, упала — причина,
 * готова — результат. Данные приходят по сокету, запасной опрос — в `useOperation`.
 */
export function OperationStatus({ operationId, renderResult }: OperationStatusProps) {
    const t = useTranslations("common.operations");
    const text = useOperationText();
    const { data, isError } = useOperation(operationId);

    if (!operationId) return null;
    if (isError) {
        return (
            <p role="status" className="text-sm text-destructive">
                {t("unavailable")}
            </p>
        );
    }
    if (!data || data.status === "queued" || data.status === "running") {
        return (
            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {t(data?.status === "queued" ? "queued" : "running")}
            </p>
        );
    }
    if (data.status === "failed") {
        return (
            <p role="status" className="text-sm text-destructive">
                {t("failedShort", { reason: text.reason(data.error) })}
            </p>
        );
    }
    return (
        <div role="status" className="text-sm">
            {renderResult && data.result ? renderResult(data.result) : t("done")}
        </div>
    );
}
