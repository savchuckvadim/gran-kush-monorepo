"use client";

import { useTranslations } from "next-intl";

import { Loader2 } from "lucide-react";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { Button } from "@workspace/ui";

/** Загрузка, ошибка или пустой список вместо таблицы. */
export function ListStatus({
    isLoading,
    error,
    onRetry,
    emptyText,
}: {
    isLoading: boolean;
    error: unknown;
    onRetry: () => void;
    emptyText: string | null;
}) {
    const t = useTranslations("billing.errors");

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        );
    }
    if (error) {
        return (
            <div className="flex flex-col items-center gap-3 py-10 text-center text-sm">
                <p className="font-medium text-destructive">{t("loadFailed")}</p>
                <p className="text-muted-foreground">{getApiErrorMessage(error)}</p>
                <Button variant="outline" size="sm" onClick={onRetry}>
                    {t("retry")}
                </Button>
            </div>
        );
    }
    if (emptyText) {
        return <p className="py-10 text-center text-sm text-muted-foreground">{emptyText}</p>;
    }
    return null;
}
