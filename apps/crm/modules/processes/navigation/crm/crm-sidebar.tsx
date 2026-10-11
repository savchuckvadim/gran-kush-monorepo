"use client";

import { useTranslations } from "next-intl";

import { CrmLogoutButton } from "@/modules/shared";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";
import { Sidebar } from "@/modules/shared/ui/Sidebar";

import { useCrmNavigation } from "./crm-navigation.hook";

/** `mobilePanel` — header controls that move into the drawer on phones. */
export function CrmSidebar({ mobilePanel }: { mobilePanel?: React.ReactNode }) {
    const t = useTranslations("crm.shell");
    const localizedLink = useLocalizedLink();
    const items = useCrmNavigation();

    return (
        <Sidebar
            title={t("brand")}
            items={items}
            homeHref={localizedLink(ROUTES.CRM_HOME)}
            mobilePanel={mobilePanel}
            footer={<CrmLogoutButton variant="outline" />}
        />
    );
}
