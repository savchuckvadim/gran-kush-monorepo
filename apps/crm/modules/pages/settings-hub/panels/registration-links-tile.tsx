"use client";

import { useTranslations } from "next-intl";

import { Link2 } from "lucide-react";

import { useRegistrationLinks } from "@/modules/entities/registration-links";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

import { SettingsTile } from "../settings-tile";

/** Ссылки регистрации: отдельно, потому что их запрос — только для тех, у кого есть `members.invite`. */
export function RegistrationLinksTile() {
    const t = useTranslations("crm.settingsHub.tiles");
    const link = useLocalizedLink();
    // ready links for the tile's list, the whole set only for its size
    const readyLinks = useRegistrationLinks({ status: "ready", limit: 5 });
    const allLinks = useRegistrationLinks({ limit: 1 });

    return (
        <SettingsTile
            icon={Link2}
            title={t("registrationLinks.title")}
            description={t("registrationLinks.description")}
            metric={readyLinks.data?.total ?? 0}
            metricLabel={t("registrationLinks.metric", { total: allLinks.data?.total ?? 0 })}
            items={(readyLinks.data?.links ?? []).map((item) => item.name)}
            loading={readyLinks.isLoading}
            href={link(ROUTES.CRM_SETTINGS_REGISTRATION_LINKS)}
        />
    );
}
