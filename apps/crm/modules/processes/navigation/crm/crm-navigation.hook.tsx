"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { Boxes } from "lucide-react";

import { useEntityDefinitions } from "@/modules/entities/entity-settings";
import { ROUTES, useLocalizedLink } from "@/modules/shared";

import { ICrmNavigation } from "./crm-navigation.interface";
import { CRM_NAVIGATION } from "./data";

export function useCrmNavigation(): ICrmNavigation[] {
    const t = useTranslations("crm.shell");
    const localizedLink = useLocalizedLink();
    const pathname = usePathname();
    const { data: definitions } = useEntityDefinitions();

    const staticItems = CRM_NAVIGATION.map((item) => {
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

    // Кастомные сущности (смарт-процессы) — между статическими разделами и настройками
    const customItems: ICrmNavigation[] = (definitions ?? [])
        .filter((d) => !d.isSystem && d.isActive !== false && d.code)
        .map((d, index) => {
            const url = localizedLink(`${ROUTES.CRM_ENTITIES}/${d.code}`);
            return {
                id: 100 + index,
                code: `entity-${d.code}`,
                url,
                title: d.name ?? d.code ?? "",
                isActive: pathname === url || pathname.startsWith(`${url}/`),
                isAdmin: false,
                icon: <Boxes />,
            };
        });

    const settingsIndex = staticItems.findIndex((item) => item.code === "settings");
    if (settingsIndex === -1) {
        return [...staticItems, ...customItems];
    }
    return [
        ...staticItems.slice(0, settingsIndex),
        ...customItems,
        ...staticItems.slice(settingsIndex),
    ];
}
