"use client";

import { useTranslations } from "next-intl";

import { Card } from "@workspace/ui";

import {
    type FinanceCategory,
    type FinanceOverview,
    useFinanceCategoryLabel,
} from "@/modules/entities/finance";
import { useMoneyFormat } from "@/modules/shared";
import { CardHeading } from "@/modules/shared/ui";

/** Сколько статей показать: крупные — то, что приносит и ест деньги. */
const TOP = 6;

interface CategoryTotalsProps {
    overview: FinanceOverview;
    categories: readonly FinanceCategory[];
    direction: "income" | "expense";
    onOpen: (categoryId: string) => void;
}

/** Крупнейшие статьи доходов или расходов периода с долей от итога. */
export function CategoryTotals({ overview, categories, direction, onOpen }: CategoryTotalsProps) {
    const t = useTranslations("crm.finance.overview");
    const label = useFinanceCategoryLabel();
    const money = useMoneyFormat();
    const rows = overview.byCategory.filter((row) => row.direction === direction).slice(0, TOP);
    const total = direction === "income" ? overview.income.net : overview.expense.net;
    return (
        <Card contentClassName="space-y-3 px-0">
            <CardHeading title={t(`top.${direction}`)} />
            {rows.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">{t("empty")}</p>
            ) : (
                <ul className="space-y-2">
                    {rows.map((row) => {
                        const category = categories.find((item) => item.id === row.categoryId);
                        const share = total
                            ? Math.max(0, Math.min(100, (row.net / total) * 100))
                            : 0;
                        return (
                            <li key={row.categoryId}>
                                <button
                                    type="button"
                                    onClick={() => onOpen(row.categoryId)}
                                    className="w-full space-y-1 rounded-md px-2 py-1 text-left text-sm hover:bg-muted"
                                >
                                    <span className="flex justify-between gap-2">
                                        <span className="truncate">
                                            {category ? label(category) : "—"}
                                        </span>
                                        <span className="tabular-nums">{money(row.net)}</span>
                                    </span>
                                    <span className="block h-1.5 rounded-full bg-muted">
                                        <span
                                            className="block h-1.5 rounded-full bg-primary"
                                            style={{ width: `${share}%` }}
                                        />
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </Card>
    );
}
