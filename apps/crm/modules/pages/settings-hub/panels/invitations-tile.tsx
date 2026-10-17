"use client";

import { useTranslations } from "next-intl";

import { Mail } from "lucide-react";

import { useInvitations } from "@/modules/entities/invitations";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

import { SettingsTile } from "../settings-tile";

export function InvitationsTile() {
    const t = useTranslations("crm.settingsHub.tiles");
    const link = useLocalizedLink();
    const invitations = useInvitations();
    const pending = (invitations.data ?? []).filter((item) => item.status === "pending");

    return (
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
    );
}
