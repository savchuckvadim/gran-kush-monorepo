"use client";

import { useTranslations } from "next-intl";

import type { ReactNode } from "react";

import { getApiErrorMessage } from "@workspace/api-client/core";

import { type OrganizationProfile, useOrganizationProfile } from "@/modules/entities/finance";
import { usePortalModules } from "@/modules/entities/portal-modules";
import { PageSpinner } from "@/modules/shared/ui";

import { FinanceModuleOffer } from "./finance-module-offer";

interface FinanceModuleGateProps {
    children: (profile: OrganizationProfile) => ReactNode;
}

/**
 * Пускает в раздел финансов, только когда модуль клуба включён и профиль организации загружен.
 * Иначе — предложение подключить модуль, спиннер или ошибка загрузки: запросы финансов при
 * выключенном модуле API отклоняет (403 `module_disabled`), поэтому раньше их не шлём.
 */
export function FinanceModuleGate({ children }: FinanceModuleGateProps) {
    const t = useTranslations("crm.finance.module");
    const modules = usePortalModules();
    const finance = modules.data?.find((module) => module.code === "finance");
    const profile = useOrganizationProfile({ enabled: finance?.enabled === true });

    const error = modules.error ?? profile.error;
    if (error) return <p className="text-sm text-destructive">{getApiErrorMessage(error)}</p>;
    if (modules.data && !finance?.available) {
        return <p className="text-sm text-muted-foreground">{t("unavailable")}</p>;
    }
    if (finance && !finance.enabled) return <FinanceModuleOffer />;
    if (!profile.data) return <PageSpinner />;
    return children(profile.data);
}
