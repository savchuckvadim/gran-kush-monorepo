"use client";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { useLocalizedLink } from "@/modules/shared";

import { PROFILE_NAVIGATION } from "./data";
import { IProfileNavigation } from "./profile-navigation.interface";

export function useProfileNavigation(): IProfileNavigation[] {
    const t = useTranslations("profile");
    const localizedLink = useLocalizedLink();
    const pathname = usePathname();

    const items = PROFILE_NAVIGATION.map((item) => {
        const isActive = pathname === localizedLink(item.url);

        return {
            ...item,
            title: t(`nav.${item.code}`),
            url: localizedLink(item.url),
            isActive,
        };
    });

    return items;
}
