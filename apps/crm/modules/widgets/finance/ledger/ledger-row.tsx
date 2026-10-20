"use client";

import { useTranslations } from "next-intl";

import { Paperclip, Undo2 } from "lucide-react";

import {
    type FinanceCategory,
    type LedgerEntry,
    useFinanceCategoryLabel,
} from "@/modules/entities/finance";
import { useCalendarDateFormat, useMoneyFormat } from "@/modules/shared";

import { useEntryTitle } from "./use-entry-title";

/** Деньги пришли — плюс, ушли — минус; сторно расхода возвращает деньги и идёт с плюсом. */
const signOf = (entry: LedgerEntry): string => {
    if (entry.direction === "transfer") return "";
    const incoming = entry.direction === "income";
    return incoming === entry.totals.payable >= 0 ? "+" : "−";
};

interface LedgerRowProps {
    entry: LedgerEntry;
    categories: readonly FinanceCategory[];
    onOpen: (entry: LedgerEntry) => void;
}

/** Строка реестра: дата, что и с кем, статья, счёт, сумма к оплате; отменённая — зачёркнута. */
export function LedgerRow({ entry, categories, onOpen }: LedgerRowProps) {
    const t = useTranslations("crm.finance");
    const date = useCalendarDateFormat();
    const money = useMoneyFormat(entry.currency);
    const label = useFinanceCategoryLabel();
    const title = useEntryTitle();
    const category = categories.find((item) => item.id === entry.categoryId);
    const voided = entry.status === "void";
    const account =
        entry.direction === "transfer" && entry.toAccount
            ? `${t(`accounts.${entry.account}`)} → ${t(`accounts.${entry.toAccount}`)}`
            : t(`accounts.${entry.account}`);
    return (
        <tr
            className={`cursor-pointer border-b text-sm last:border-b-0 hover:bg-muted/50 ${voided ? "text-muted-foreground line-through" : ""}`}
            onClick={() => onOpen(entry)}
        >
            <td className="px-3 py-2 whitespace-nowrap text-muted-foreground tabular-nums">
                {date(entry.occurredOn)}
            </td>
            <td className="max-w-72 px-3 py-2">
                <span className="flex items-center gap-1.5">
                    {entry.reversalOfId && (
                        <Undo2 className="size-3.5 shrink-0" aria-label={t("ledger.reversal")} />
                    )}
                    <span className="truncate">{title(entry)}</span>
                    {entry.attachment && (
                        <Paperclip
                            className="size-3.5 shrink-0 text-muted-foreground"
                            aria-label={t("ledger.hasAttachment")}
                        />
                    )}
                </span>
                {entry.counterpartyName && (
                    <span className="block truncate text-xs text-muted-foreground">
                        {entry.counterpartyName}
                    </span>
                )}
            </td>
            <td className="hidden px-3 py-2 md:table-cell">{category ? label(category) : "—"}</td>
            <td className="hidden px-3 py-2 whitespace-nowrap lg:table-cell">{account}</td>
            <td
                className={`px-3 py-2 text-right whitespace-nowrap tabular-nums ${entry.direction === "income" ? "text-emerald-700 dark:text-emerald-400" : ""}`}
            >
                {signOf(entry)}
                {money(Math.abs(entry.totals.payable))}
            </td>
        </tr>
    );
}
