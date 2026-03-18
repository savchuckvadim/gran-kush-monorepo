"use client";

import { useTranslations } from "next-intl";

import { Loader2, PieChart } from "lucide-react";

import { Card } from "@workspace/ui";

import { useReportByType } from "@/modules/entities/finance";

export function ReportByTypeCard() {
    const t = useTranslations("crm.finance.reports");
    const { data: items, isLoading } = useReportByType();

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

    if (!items || items.length === 0) return null;

    return (
        <Card className="p-4">
            <div className="mb-4 flex items-center gap-2">
                <PieChart className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-base font-medium">{t("byTypeTitle")}</h2>
            </div>

            <div className="space-y-3">
                {items.map((item) => (
                    <div key={item.type} className="flex items-center justify-between rounded-md border p-3">
                        <div>
                            <p className="text-sm font-medium">{t(`type.${item.type}`)}</p>
                            <p className="text-xs text-muted-foreground">
                                {item.count} {t("transactions")}
                            </p>
                        </div>
                        <p className="font-mono text-sm font-bold">€{item.totalAmount}</p>
                    </div>
                ))}
            </div>
        </Card>
    );
}
