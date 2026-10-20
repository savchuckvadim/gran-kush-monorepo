"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { Settings, Wallet } from "lucide-react";

import { Button } from "@workspace/ui";

import type { OrganizationProfile } from "@/modules/entities/finance";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";
import { FinanceSummaryCard, ReportByTypeCard, TransactionsTable } from "@/modules/widgets/finance";

/** Учёт клуба: кто ведёт (организация и режимы налогов) и сводка операций. */
export function FinanceDashboard({ profile }: { profile: OrganizationProfile }) {
    const t = useTranslations("crm.finance");
    const link = useLocalizedLink();
    const organization = [
        profile.tradeName ?? profile.legalName,
        t(`profile.legalForm.options.${profile.legalForm}`),
        t(`profile.vat.options.${profile.vatRegime}`),
    ].filter(Boolean);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="flex items-center gap-2 text-2xl font-semibold">
                        <Wallet className="size-6" aria-hidden="true" />
                        {t("title")}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">{organization.join(" · ")}</p>
                </div>
                <Button asChild variant="outline" size="sm">
                    <Link href={link(ROUTES.CRM_FINANCE_SETTINGS)}>
                        <Settings aria-hidden="true" />
                        {t("dashboard.settings")}
                    </Link>
                </Button>
            </div>

            <FinanceSummaryCard />
            <ReportByTypeCard />
            <TransactionsTable />
        </div>
    );
}
