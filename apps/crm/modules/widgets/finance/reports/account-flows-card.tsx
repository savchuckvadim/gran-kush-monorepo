"use client";

import { useTranslations } from "next-intl";

import { Card } from "@workspace/ui";

import type { PeriodReport } from "@/modules/entities/finance";
import { useMoneyFormat } from "@/modules/shared";
import { CardHeading } from "@/modules/shared/ui";

const COLUMNS = ["opening", "inflow", "outflow", "closing"] as const;

/** Касса, банк и карта за период: остаток на начало, приход, расход, остаток на конец. */
export function AccountFlowsCard({ report }: { report: PeriodReport }) {
    const t = useTranslations("crm.finance");
    const money = useMoneyFormat();
    return (
        <Card contentClassName="space-y-3 px-0">
            <CardHeading title={t("reports.accounts.title")} hint={t("reports.accounts.hint")} />
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                            <th className="px-3 py-2 font-medium">
                                {t("reports.accounts.account")}
                            </th>
                            {COLUMNS.map((column) => (
                                <th key={column} className="px-3 py-2 text-right font-medium">
                                    {t(`reports.accounts.${column}`)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {report.accounts.map((flow) => (
                            <tr key={flow.account} className="border-b last:border-0">
                                <td className="px-3 py-2">{t(`accounts.${flow.account}`)}</td>
                                {COLUMNS.map((column) => (
                                    <td
                                        key={column}
                                        className={`px-3 py-2 text-right tabular-nums ${flow[column] < 0 ? "text-destructive" : ""}`}
                                    >
                                        {money(flow[column])}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
