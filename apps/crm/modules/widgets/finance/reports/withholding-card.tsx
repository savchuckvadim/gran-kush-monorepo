"use client";

import { useTranslations } from "next-intl";

import { Card } from "@workspace/ui";

import type { PeriodReport } from "@/modules/entities/finance";
import { useMoneyFormat } from "@/modules/shared";
import { CardHeading } from "@/modules/shared/ui";

const SIDES = ["received", "applied"] as const;

/** Удержания IRPF: удержали с наших доходов (зачёт) и удержали мы (перечислить по 111). */
export function WithholdingCard({ report }: { report: PeriodReport }) {
    const t = useTranslations("crm.finance.reports.withholding");
    const money = useMoneyFormat();
    return (
        <Card contentClassName="space-y-3 px-0">
            <CardHeading title={t("title")} hint={t("hint")} />
            <ul className="divide-y">
                {SIDES.map((side) => {
                    const totals = report.withholding[side];
                    return (
                        <li key={side} className="flex items-start gap-3 py-2 text-sm">
                            <div className="flex-1">
                                <p>{t(`${side}.label`)}</p>
                                <p className="text-xs text-muted-foreground">
                                    {t(`${side}.details`, {
                                        base: money(totals.base),
                                        count: totals.count,
                                        counterparties: totals.counterparties,
                                    })}
                                </p>
                            </div>
                            <span className="tabular-nums">{money(totals.amount)}</span>
                        </li>
                    );
                })}
            </ul>
        </Card>
    );
}
