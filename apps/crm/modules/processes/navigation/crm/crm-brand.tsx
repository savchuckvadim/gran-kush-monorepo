"use client";

import { useTranslations } from "next-intl";

import { usePortalInfo } from "@/modules/entities/portal";
import { ShellBrand } from "@/modules/shared/ui/Brand";

/** PafPaf, а на тарифе с `customBrand` — название клуба. */
export function CrmBrand() {
    const t = useTranslations("crm.shell");
    const { data: info } = usePortalInfo();
    const clubName = info?.subscription?.features.customBrand ? info.displayName : null;

    return <ShellBrand name={t("brand")} clubName={clubName} />;
}
