"use client";

import { useTranslations } from "next-intl";

import { ArrowDownLeft, ArrowUpRight, Receipt, Scale } from "lucide-react";

import { StatTile } from "@workspace/ui";

import type { FinanceOverview } from "@/modules/entities/finance";
import { useMoneyFormat } from "@/modules/shared";

/**
 * Итоги периода: доходы и расходы по базе (налог — не доход), результат и разница IVA —
 * начислено с продаж минус уплачено поставщикам (для gestor, без учёта пропорции).
 */
export function FinanceOverviewTiles({ overview }: { overview: FinanceOverview }) {
    const t = useTranslations("crm.finance.overview");
    const money = useMoneyFormat();
    const vat = overview.income.tax - overview.expense.tax;
    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
                icon={<ArrowDownLeft />}
                label={t("income")}
                value={money(overview.income.net)}
                hint={t("count", { count: overview.income.count })}
            />
            <StatTile
                icon={<ArrowUpRight />}
                label={t("expense")}
                value={money(overview.expense.net)}
                hint={t("count", { count: overview.expense.count })}
            />
            <StatTile
                icon={<Scale />}
                label={t("result")}
                value={
                    <span className={overview.result < 0 ? "text-destructive" : undefined}>
                        {money(overview.result)}
                    </span>
                }
                hint={t("resultHint")}
            />
            <StatTile
                icon={<Receipt />}
                label={t("vat")}
                value={money(vat)}
                hint={t("vatHint", {
                    charged: money(overview.income.tax),
                    paid: money(overview.expense.tax),
                })}
            />
        </div>
    );
}
