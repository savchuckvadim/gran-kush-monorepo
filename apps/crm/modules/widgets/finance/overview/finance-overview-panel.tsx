"use client";

import { useTranslations } from "next-intl";

import { useFinanceCategories, useFinanceOverview } from "@/modules/entities/finance";
import { PageSpinner } from "@/modules/shared/ui/Loading/PageSpinner";

import { AccountBalances } from "./account-balances";
import { CategoryTotals } from "./category-totals";
import { FinanceOverviewTiles } from "./finance-overview-tiles";

interface FinanceOverviewPanelProps {
    range: { from: string; to: string };
    /** Открыть проводки статьи в реестре */
    onOpenCategory: (categoryId: string) => void;
}

/** Обзор периода: итоги, крупные статьи доходов и расходов, остатки счетов. */
export function FinanceOverviewPanel({ range, onOpenCategory }: FinanceOverviewPanelProps) {
    const t = useTranslations("crm.finance.overview");
    const overview = useFinanceOverview(range);
    const categories = useFinanceCategories({ includeArchived: true }).data ?? [];
    if (overview.isLoading) return <PageSpinner />;
    if (!overview.data) return <p className="text-sm text-destructive">{t("error")}</p>;
    return (
        <div className="space-y-4">
            <FinanceOverviewTiles overview={overview.data} />
            <div className="grid gap-4 lg:grid-cols-3">
                <CategoryTotals
                    overview={overview.data}
                    categories={categories}
                    direction="income"
                    onOpen={onOpenCategory}
                />
                <CategoryTotals
                    overview={overview.data}
                    categories={categories}
                    direction="expense"
                    onOpen={onOpenCategory}
                />
                <AccountBalances overview={overview.data} />
            </div>
        </div>
    );
}
