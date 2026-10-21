"use client";

import { useTranslations } from "next-intl";

import { type UseFormReturn, useWatch } from "react-hook-form";

import { type FinanceCategory, useFinanceCategoryLabel } from "@/modules/entities/finance";
import { useCalendarDateFormat, useMoneyFormat } from "@/modules/shared";

import type { LedgerEntryFormValues } from "../model/ledger-entry-form";

interface LedgerEntrySummaryProps {
    form: UseFormReturn<LedgerEntryFormValues>;
    categories: readonly FinanceCategory[];
}

/** Последний шаг: что запишется — направление, дата, статья, описание и сумма одной строкой. */
export function LedgerEntrySummary({ form, categories }: LedgerEntrySummaryProps) {
    const t = useTranslations("crm.finance.entryForm");
    const directions = useTranslations("crm.finance.directions");
    const categoryLabel = useFinanceCategoryLabel();
    const money = useMoneyFormat();
    const date = useCalendarDateFormat();
    const [direction, occurredOn, categoryId, description, amount] = useWatch({
        control: form.control,
        name: ["direction", "occurredOn", "categoryId", "description", "amount"],
    });
    const category = categories.find((item) => item.id === categoryId);
    const parts = [
        directions(direction),
        occurredOn ? date(occurredOn) : null,
        category ? categoryLabel(category) : null,
        description.trim() || null,
    ].filter(Boolean);

    return (
        <div className="rounded-md border px-3 py-2 text-sm">
            <p className="text-xs text-muted-foreground">{t("summaryTitle")}</p>
            <p className="mt-0.5 flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="min-w-0 truncate">{parts.join(" · ")}</span>
                <span className="font-semibold tabular-nums">
                    {Number.isFinite(amount) ? money(amount) : "—"}
                </span>
            </p>
        </div>
    );
}
