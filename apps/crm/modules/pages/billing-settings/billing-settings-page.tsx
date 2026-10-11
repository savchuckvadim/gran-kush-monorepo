"use client";

import { useTranslations } from "next-intl";

import { BillingPanel } from "@/modules/features/billing";

export function BillingSettingsPage() {
    const t = useTranslations("crm.billing");

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">{t("title")}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
            </div>
            <BillingPanel />
        </div>
    );
}
