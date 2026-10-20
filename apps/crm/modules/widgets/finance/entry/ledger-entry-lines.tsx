"use client";

import { useTranslations } from "next-intl";

import type { LedgerEntry } from "@/modules/entities/finance";
import { useMoneyFormat } from "@/modules/shared";

/** Строки налога, удержание и итоги: база + налог = по документу; минус IRPF = прошло по счёту. */
export function LedgerEntryLines({ entry }: { entry: LedgerEntry }) {
    const t = useTranslations("crm.finance.entry");
    const money = useMoneyFormat(entry.currency);
    const rate = (line: LedgerEntry["lines"][number]) =>
        line.treatment === null
            ? t("noBreakdown")
            : line.treatment === "taxable"
              ? `${line.percent} %`
              : t(`treatments.${line.treatment}`);
    return (
        <table className="w-full text-sm">
            <thead>
                <tr className="border-b text-xs text-muted-foreground">
                    <th className="py-1.5 text-left font-medium">{t("rate")}</th>
                    <th className="py-1.5 text-right font-medium">{t("net")}</th>
                    <th className="py-1.5 text-right font-medium">{t("tax")}</th>
                </tr>
            </thead>
            <tbody className="tabular-nums">
                {entry.lines.map((line) => (
                    <tr key={`${line.treatment}-${line.percent}`} className="border-b">
                        <td className="py-1.5">{rate(line)}</td>
                        <td className="py-1.5 text-right">{money(line.net)}</td>
                        <td className="py-1.5 text-right">{money(line.tax)}</td>
                    </tr>
                ))}
                <tr>
                    <td className="py-1.5 text-muted-foreground">{t("total")}</td>
                    <td colSpan={2} className="py-1.5 text-right">
                        {money(entry.totals.total)}
                    </td>
                </tr>
                {entry.withholding && (
                    <tr>
                        <td className="py-1.5 text-muted-foreground">
                            {t("withholding", { percent: entry.withholding.percent })}
                        </td>
                        <td colSpan={2} className="py-1.5 text-right">
                            −{money(entry.withholding.amount)}
                        </td>
                    </tr>
                )}
                <tr className="font-medium">
                    <td className="py-1.5">{t("payable")}</td>
                    <td colSpan={2} className="py-1.5 text-right">
                        {money(entry.totals.payable)}
                    </td>
                </tr>
            </tbody>
        </table>
    );
}
