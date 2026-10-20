"use client";

import { useTranslations } from "next-intl";

import { usePermissions } from "@/modules/entities/access";
import type { OrganizationProfile } from "@/modules/entities/finance";
import { OrganizationProfileForm } from "@/modules/features/finance-setup";

/** Первый шаг после подключения: проверить пресет формы и налогов, вписать реквизиты. */
export function FinanceSetupStep({ profile }: { profile: OrganizationProfile }) {
    const t = useTranslations("crm.finance.setup");
    const { can } = usePermissions();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">{t("title")}</h1>
                <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t("subtitle")}</p>
            </div>
            <OrganizationProfileForm
                profile={profile}
                canEdit={can("finance.admin")}
                submitLabel={t("submit")}
            />
        </div>
    );
}
