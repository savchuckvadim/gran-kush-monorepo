"use client";

import { useTranslations } from "next-intl";

import { ShieldCheck } from "lucide-react";

import { usePortalRoles, useRoleLabel } from "@/modules/entities/access";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

import { SettingsTile } from "../settings-tile";

export function RolesTile() {
    const t = useTranslations("crm.settingsHub.tiles");
    const link = useLocalizedLink();
    const roles = usePortalRoles();
    const label = useRoleLabel();
    const list = roles.data?.roles ?? [];

    return (
        <SettingsTile
            icon={ShieldCheck}
            title={t("roles.title")}
            description={t("roles.description")}
            metric={list.length}
            metricLabel={t("roles.metric")}
            items={list.map(label)}
            loading={roles.isLoading}
            href={link(ROUTES.CRM_SETTINGS_ROLES)}
        />
    );
}
