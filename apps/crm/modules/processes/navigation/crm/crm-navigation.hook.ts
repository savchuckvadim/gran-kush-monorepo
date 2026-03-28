"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { ROUTES, useLocalizedLink } from "@/modules/shared";

import { ICrmNavigation } from "./crm-navigation.interface";
import { CRM_NAVIGATION } from "./data";

export function useCrmNavigation(): ICrmNavigation[] {
    const t = useTranslations("crm.shell");
    const localizedLink = useLocalizedLink();
    const pathname = usePathname();

    return CRM_NAVIGATION.map((item) => {
        const localizedUrl = localizedLink(item.url);
        const memberSectionRoot = localizedLink(ROUTES.CRM_MEMBER_BASE);
        const productSectionRoot = localizedLink(ROUTES.CRM_PRODUCT_BASE);
        const orderSectionRoot = localizedLink(ROUTES.CRM_ORDER_BASE);

        const isActive =
            item.code === "clients"
                ? pathname === memberSectionRoot ||
                  pathname.startsWith(`${memberSectionRoot}/`)
                : item.code === "products"
                  ? pathname === productSectionRoot ||
                    pathname.startsWith(`${productSectionRoot}/`)
                  : item.code === "orders"
                    ? pathname === orderSectionRoot || pathname.startsWith(`${orderSectionRoot}/`)
                    : pathname === localizedUrl || pathname.startsWith(`${localizedUrl}/`);

        return {
            ...item,
            title: t(`nav.${item.code}`),
            url: localizedUrl,
            isActive,
        };
    });
}
