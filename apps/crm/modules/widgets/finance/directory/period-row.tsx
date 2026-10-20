"use client";

import { useLocale, useTranslations } from "next-intl";

import { Lock, LockOpen } from "lucide-react";

import { Badge, Button } from "@workspace/ui";

import type { FinancePeriod } from "@/modules/entities/finance";
import { useDateTimeFormat } from "@/modules/shared";

import { monthLabel } from "../ledger/month-range";

interface PeriodRowProps {
    period: FinancePeriod;
    canAdmin: boolean;
    onClose: (period: FinancePeriod) => void;
    onReopen: (period: FinancePeriod) => void;
    onOpenMonth: (month: string) => void;
}

/** Месяц учёта: сколько проводок, закрыт ли и кем; закрыть можно прошедший. */
export function PeriodRow({ period, canAdmin, onClose, onReopen, onOpenMonth }: PeriodRowProps) {
    const t = useTranslations("crm.finance.periods");
    const locale = useLocale();
    const dateTime = useDateTimeFormat();
    const key = `${period.year}-${String(period.month).padStart(2, "0")}`;
    const name = monthLabel(key, locale);
    return (
        <tr className="border-b text-sm last:border-b-0">
            <td className="px-3 py-2">
                <Button variant="link" size="sm" className="px-0" onClick={() => onOpenMonth(key)}>
                    {name}
                </Button>
            </td>
            <td className="px-3 py-2 text-muted-foreground tabular-nums">
                {t("entries", { count: period.entryCount })}
            </td>
            <td className="px-3 py-2">
                {period.closedAt ? (
                    <span className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                            <Lock aria-hidden="true" />
                            {t("closed")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                            {t("closedBy", {
                                name: period.closedByName ?? "—",
                                at: dateTime(period.closedAt),
                            })}
                        </span>
                    </span>
                ) : (
                    <span className="text-muted-foreground">{t("open")}</span>
                )}
            </td>
            <td className="px-3 py-2 text-right">
                {canAdmin && period.closable && (
                    <Button variant="outline" size="sm" onClick={() => onClose(period)}>
                        <Lock aria-hidden="true" />
                        {t("close")}
                    </Button>
                )}
                {canAdmin && period.closedAt && (
                    <Button variant="ghost" size="sm" onClick={() => onReopen(period)}>
                        <LockOpen aria-hidden="true" />
                        {t("reopen")}
                    </Button>
                )}
            </td>
        </tr>
    );
}
