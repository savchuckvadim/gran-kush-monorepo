"use client";

import { useTranslations } from "next-intl";

import { HeaderAppearance } from "@/modules/features";
import { AppHeader } from "@/modules/shared/ui/shell";
import { PortalSwitcher } from "@/modules/widgets/portal-switcher";

import { AccountMenu } from "./account-menu";
import { HeaderQuickActions } from "./header-quick-actions";
import { SearchTrigger } from "./search-trigger";

/**
 * Шапка CRM: слева клуб, справа поиск, действия у двери, оформление и аккаунт. Раздел в шапке
 * не повторяется: его показывают меню и заголовок страницы.
 */
export function CrmHeader() {
    const t = useTranslations("crm.shell");

    return (
        <AppHeader
            labels={{ openMenu: t("openMenu"), closeMenu: t("closeMenu") }}
            start={<PortalSwitcher />}
            end={
                <>
                    <SearchTrigger />
                    <HeaderQuickActions />
                    <HeaderAppearance />
                    <AccountMenu />
                </>
            }
        />
    );
}
