"use client";

import { useTranslations } from "next-intl";

import { DollarSign, Loader2, TrendingDown, TrendingUp } from "lucide-react";

import { Card } from "@workspace/ui";

import { useReportSummary } from "@/modules/entities/finance";

export function FinanceSummaryCard() {
    const t = useTranslations("crm.finance.summary");
    const { data: summary, isLoading } = useReportSummary();

    if (isLoading) {
        return (
            <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">{t("loading")}</span>
                </div>
            </Card>
        );
    }

    if (!summary) return null;

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Доход */}
            <Card className="p-4">
                <div className="flex items-center gap-2">
                    <div className="rounded-md bg-green-500/10 p-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">{t("totalIncome")}</p>
                        <p className="text-xl font-bold text-green-700">
                            €{summary.totalIncome ?? 0}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Расход */}
            <Card className="p-4">
                <div className="flex items-center gap-2">
                    <div className="rounded-md bg-red-500/10 p-2">
                        <TrendingDown className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">{t("totalExpense")}</p>
                        <p className="text-xl font-bold text-red-700">
                            €{summary.totalExpense ?? 0}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Баланс */}
            <Card className="p-4">
                <div className="flex items-center gap-2">
                    <div className="rounded-md bg-blue-500/10 p-2">
                        <DollarSign className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">{t("netBalance")}</p>
                        <p className="text-xl font-bold">€{summary.netTotal ?? 0}</p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
