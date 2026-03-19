"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { useLocalizedLink } from "@/modules/shared";

import { ICrmNavigation } from "./crm-navigation.interface";
import { CRM_NAVIGATION } from "./data";

export function useCrmNavigation(): ICrmNavigation[] {
    const t = useTranslations("crm.shell");
    const localizedLink = useLocalizedLink();
    const pathname = usePathname();

    return CRM_NAVIGATION.map((item) => {
        const localizedUrl = localizedLink(item.url);
        const isActive = pathname === localizedUrl || pathname.startsWith(`${localizedUrl}/`);

        return {
            ...item,
            title: t(`nav.${item.code}`),
            url: localizedUrl,
            isActive,
        };
    });
}
