"use client";

import { useTranslations } from "next-intl";

import { ChevronRight } from "lucide-react";

import type { TaxFormCell, TaxFormCode } from "@/modules/entities/finance";
import { useMoneyFormat } from "@/modules/shared";

interface TaxFormCellRowProps {
    form: TaxFormCode;
    cell: TaxFormCell;
    active: boolean;
    onOpen: (code: string) => void;
}

/** Ячейка бланка: номер, что в ней, сумма; ячейку с проводками можно открыть. */
export function TaxFormCellRow({ form, cell, active, onOpen }: TaxFormCellRowProps) {
    const t = useTranslations("crm.finance.reports.forms");
    const money = useMoneyFormat();
    const value = cell.kind === "percent" ? `${cell.value} %` : money(cell.value);
    const content = (
        <>
            <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground">
                [{cell.code}]
            </span>
            <span className={`flex-1 ${cell.computed ? "font-medium" : ""}`}>
                {t(`${form}.cells.${cell.code}`)}
            </span>
            <span
                className={`tabular-nums ${cell.computed ? "font-medium" : ""} ${cell.kind === "amount" && cell.value < 0 ? "text-destructive" : ""}`}
            >
                {value}
            </span>
        </>
    );
    if (cell.entryCount === 0) {
        return (
            <li className="flex items-center gap-3 px-3 py-2 text-sm">
                {content}
                <span className="size-4" aria-hidden="true" />
            </li>
        );
    }
    return (
        <li>
            <button
                type="button"
                aria-pressed={active}
                title={t("openCell", { count: cell.entryCount })}
                onClick={() => onOpen(cell.code)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted/60 ${active ? "bg-muted" : ""}`}
            >
                {content}
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
            </button>
        </li>
    );
}
