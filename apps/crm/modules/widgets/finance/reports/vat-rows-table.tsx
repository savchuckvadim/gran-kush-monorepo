"use client";

import { useTranslations } from "next-intl";

import type { PeriodReport } from "@/modules/entities/finance";
import { useMoneyFormat } from "@/modules/shared";

type VatRow = PeriodReport["vat"]["output"][number];

interface VatRowsTableProps {
    title: string;
    rows: readonly VatRow[];
    total: number;
}

/** Строки IVA одной стороны: ставка, база, налог; итог налога внизу. */
export function VatRowsTable({ title, rows, total }: VatRowsTableProps) {
    const t = useTranslations("crm.finance.reports.vat");
    const money = useMoneyFormat();
    const rateLabel = (row: VatRow) =>
        row.treatment === null
            ? t("unclassified")
            : row.treatment === "taxable"
              ? `${row.percent} %`
              : t(`treatments.${row.treatment}`);
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                        <th className="px-3 py-2 font-medium">{title}</th>
                        <th className="px-3 py-2 text-right font-medium">{t("base")}</th>
                        <th className="px-3 py-2 text-right font-medium">{t("tax")}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 && (
                        <tr>
                            <td colSpan={3} className="px-3 py-3 text-muted-foreground">
                                {t("empty")}
                            </td>
                        </tr>
                    )}
                    {rows.map((row) => (
                        <tr key={`${row.treatment ?? "none"}-${row.percent}`} className="border-b">
                            <td className="px-3 py-2">{rateLabel(row)}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{money(row.base)}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{money(row.tax)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="font-medium">
                        <td className="px-3 py-2" colSpan={2}>
                            {t("total")}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{money(total)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
