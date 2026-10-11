"use client";

import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";
import { Sidebar } from "@/modules/shared/ui/Sidebar";

import { CrmBrand } from "./crm-brand";
import { useCrmNavigation } from "./crm-navigation.hook";

/** Настройки — внизу сайдбара, разделы — сверху. */
export function CrmSidebar() {
    const localizedLink = useLocalizedLink();
    const navigation = useCrmNavigation();

    return (
        <Sidebar
            brand={<CrmBrand />}
            items={navigation.filter((item) => item.code !== "settings")}
            footerItems={navigation.filter((item) => item.code === "settings")}
            homeHref={localizedLink(ROUTES.CRM_HOME)}
        />
    );
}
