"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { FieldSelect } from "@workspace/ui";

import type { QuarterRef } from "@/modules/entities/finance";

import { parseQuarterKey, quarterKey, recentQuarters } from "./report-quarter";

interface ReportQuarterSelectProps {
    value: QuarterRef;
    onChange: (quarter: QuarterRef) => void;
}

/** Квартал отчёта: текущий и семь прошлых. */
export function ReportQuarterSelect({ value, onChange }: ReportQuarterSelectProps) {
    const t = useTranslations("crm.finance.reports");
    const options = useMemo(
        () =>
            recentQuarters().map((quarter) => ({
                value: quarterKey(quarter),
                label: t("quarterLabel", { year: quarter.year, quarter: quarter.quarter }),
            })),
        [t]
    );
    return (
        <FieldSelect
            id="report-quarter"
            size="sm"
            aria-label={t("quarter")}
            className="w-48"
            value={quarterKey(value)}
            onValueChange={(key) => {
                const next = parseQuarterKey(key);
                if (next) onChange(next);
            }}
            options={options}
        />
    );
}
