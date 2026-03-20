"use client";

import { useTranslations } from "next-intl";

import { CrmLogoutButton } from "@/modules/shared";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";
import { Sidebar } from "@/modules/shared/ui/Sidebar";

import { useCrmNavigation } from "./crm-navigation.hook";

export function CrmSidebar() {
    const t = useTranslations("crm.shell");
    const localizedLink = useLocalizedLink();
    const items = useCrmNavigation();

    return (
        <Sidebar
            title={t("title")}
            items={items}
            homeHref={localizedLink(ROUTES.CRM_HOME)}
            footer={<CrmLogoutButton variant="outline" />}
        />
    );
}
