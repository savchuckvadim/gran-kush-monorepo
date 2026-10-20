"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { Boxes } from "lucide-react";

import { usePermissions } from "@/modules/entities/access";
import { useEntityDefinitions } from "@/modules/entities/entity-settings";
import { usePortalInfo } from "@/modules/entities/portal";
import { ROUTES, useLocalizedLink } from "@/modules/shared";

import { ICrmNavigation } from "./crm-navigation.interface";
import { CRM_NAVIGATION } from "./data";

/** Разделы CRM для меню и палитры команд — только те, на которые у роли есть права. */
export function useCrmNavigation(): ICrmNavigation[] {
    const t = useTranslations("crm.shell");
    const { can } = usePermissions();
    const { data: portal } = usePortalInfo();
    const modules = portal?.modules ?? [];
    const moduleVisible = (item: ICrmNavigation) =>
        !item.module || modules.includes(item.module) || can("settings.club");
    const allowed = (item: ICrmNavigation) =>
        (!item.requires || item.requires.some((code) => can(code))) && moduleVisible(item);
    const localizedLink = useLocalizedLink();
    const pathname = usePathname();
    const { data: definitions } = useEntityDefinitions();

    const staticItems = CRM_NAVIGATION.filter(allowed).map((item) => {
        const localizedUrl = localizedLink(item.url);
        const memberSectionRoot = localizedLink(ROUTES.CRM_MEMBER_BASE);
        const productSectionRoot = localizedLink(ROUTES.CRM_PRODUCT_BASE);
        const orderSectionRoot = localizedLink(ROUTES.CRM_ORDER_BASE);

        const isActive =
            item.code === "clients"
                ? pathname === memberSectionRoot || pathname.startsWith(`${memberSectionRoot}/`)
                : item.code === "products"
                  ? pathname === productSectionRoot || pathname.startsWith(`${productSectionRoot}/`)
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
        .filter((d) => !d.isSystem && d.isActive !== false && d.code && can("records.read"))
        .map((d, index) => {
            const url = localizedLink(`${ROUTES.CRM_ENTITIES}/${d.code}`);
            return {
                id: 100 + index,
                code: `entity-${d.code}`,
                url,
                title: d.name ?? d.code ?? "",
                isActive: pathname === url || pathname.startsWith(`${url}/`),
                requires: ["records.read"] as const,
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
