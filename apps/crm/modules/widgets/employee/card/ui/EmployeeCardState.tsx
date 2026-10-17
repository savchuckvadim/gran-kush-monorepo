"use client";

import { useTranslations } from "next-intl";

import { UserX } from "lucide-react";

import { Button } from "@workspace/ui";

interface EmployeeCardStateProps {
    kind: "error" | "not-found";
    onRetry?: () => void;
}

export function EmployeeCardState({ kind, onRetry }: EmployeeCardStateProps) {
    const t = useTranslations("crm.employees.card");

    return (
        <div className="flex flex-col items-center gap-3 rounded-2xl px-4 py-16 text-center ring-1 ring-foreground/10">
            <UserX className="size-10 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
                {kind === "error" ? t("loadError") : t("notFound")}
            </p>
            {kind === "error" && onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                    {t("retry")}
                </Button>
            )}
        </div>
    );
}
