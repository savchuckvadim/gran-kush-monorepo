"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";

import { FieldSelect } from "@workspace/ui";

import { useFinancePeriods } from "@/modules/entities/finance";

import { currentMonth, monthLabel } from "./month-range";

interface LedgerMonthSelectProps {
    value: string;
    onChange: (month: string) => void;
    /** Пункт «Все месяцы» — для реестра; обзору нужен конкретный месяц */
    allowAll?: boolean;
}

/** Месяцы учёта: с проводками и текущий; закрытый помечен. */
export function LedgerMonthSelect({ value, onChange, allowAll }: LedgerMonthSelectProps) {
    const t = useTranslations("crm.finance.ledger");
    const locale = useLocale();
    const periods = useFinancePeriods().data;
    const options = useMemo(() => {
        const months = (periods ?? []).map((period) => ({
            key: `${period.year}-${String(period.month).padStart(2, "0")}`,
            closed: Boolean(period.closedAt),
        }));
        if (!months.some((month) => month.key === currentMonth()))
            months.unshift({ key: currentMonth(), closed: false });
        return [
            ...(allowAll ? [{ value: "", label: t("allMonths") }] : []),
            ...months.map((month) => ({
                value: month.key,
                label: `${monthLabel(month.key, locale)}${month.closed ? ` · ${t("closedMonth")}` : ""}`,
            })),
        ];
    }, [periods, locale, allowAll, t]);
    return (
        <FieldSelect
            id="ledger-month"
            size="sm"
            aria-label={t("month")}
            className="w-48"
            value={value}
            onValueChange={onChange}
            options={options}
        />
    );
}
