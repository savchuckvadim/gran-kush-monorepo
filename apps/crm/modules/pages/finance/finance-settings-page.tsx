"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { ArrowLeft } from "lucide-react";

import { Button } from "@workspace/ui";

import { usePermissions } from "@/modules/entities/access";
import {
    FinanceModuleGate,
    FinanceModuleSwitch,
    OrganizationProfileForm,
} from "@/modules/features/finance-setup";
import { TaxRatesCard } from "@/modules/features/tax-rates";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

/** Организация, налоговые режимы и ставки клуба; ниже — отключение модуля для владельца. */
export function FinanceSettingsPage() {
    const t = useTranslations("crm.finance.settings");
    const { can } = usePermissions();
    const link = useLocalizedLink();

    return (
        <FinanceModuleGate>
            {(profile) => (
                <div className="space-y-6">
                    <div>
                        <Button asChild variant="ghost" size="sm" className="-ml-2">
                            <Link href={link(ROUTES.CRM_FINANCE)}>
                                <ArrowLeft aria-hidden="true" />
                                {t("back")}
                            </Link>
                        </Button>
                        <h1 className="mt-2 text-2xl font-semibold">{t("title")}</h1>
                        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                            {t("subtitle")}
                        </p>
                    </div>
                    <OrganizationProfileForm
                        profile={profile}
                        canEdit={can("finance.admin")}
                        submitLabel={t("submit")}
                    />
                    <TaxRatesCard />
                    <FinanceModuleSwitch />
                </div>
            )}
        </FinanceModuleGate>
    );
}
