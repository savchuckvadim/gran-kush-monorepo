"use client";

import { useTranslations } from "next-intl";

import { Wallet } from "lucide-react";

import {
    FinanceSummaryCard,
    ReportByTypeCard,
    TransactionsTable,
} from "@/modules/widgets/finance";

export default function CrmFinancePage() {
    const t = useTranslations("crm.finance");

    return (
        <div className="space-y-6">
            <div>
                <h1 className="flex items-center gap-2 text-2xl font-semibold">
                    <Wallet className="h-6 w-6" />
                    {t("title")}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
            </div>

            <FinanceSummaryCard />
            <ReportByTypeCard />
            <TransactionsTable />
        </div>
    );
}
