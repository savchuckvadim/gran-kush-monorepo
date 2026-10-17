"use client";

import { useTranslations } from "next-intl";

import { Users } from "lucide-react";

import { useEmployees } from "@/modules/entities/employee";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

import { SettingsTile } from "../settings-tile";

export function EmployeesTile() {
    const t = useTranslations("crm.settingsHub.tiles");
    const link = useLocalizedLink();
    const employees = useEmployees({ isActive: true, limit: 50 });

    return (
        <SettingsTile
            icon={Users}
            title={t("employees.title")}
            description={t("employees.description")}
            metric={employees.data?.total ?? 0}
            metricLabel={t("employees.metric")}
            items={(employees.data?.items ?? []).map((employee) => employee.email)}
            loading={employees.isLoading}
            href={link(ROUTES.CRM_EMPLOYEES)}
        />
    );
}
