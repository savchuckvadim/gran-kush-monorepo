"use client";

import { useTranslations } from "next-intl";

import { Mail, Users } from "lucide-react";

import { useEmployees } from "@/modules/entities/employee";
import { useInvitations } from "@/modules/entities/invitations";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

import { SettingsTile, SettingsTileGrid } from "../settings-tile";

export function TeamPanel() {
    const t = useTranslations("crm.settingsHub.tiles");
    const link = useLocalizedLink();
    const employees = useEmployees({ isActive: true, limit: 50 });
    const invitations = useInvitations();

    const pending = (invitations.data ?? []).filter((item) => item.status === "pending");

    return (
        <SettingsTileGrid>
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
            <SettingsTile
                icon={Mail}
                title={t("invitations.title")}
                description={t("invitations.description")}
                metric={pending.length}
                metricLabel={t("invitations.metric")}
                items={pending.map((item) => item.email)}
                loading={invitations.isLoading}
                href={link(ROUTES.CRM_SETTINGS_INVITATIONS)}
            />
        </SettingsTileGrid>
    );
}
