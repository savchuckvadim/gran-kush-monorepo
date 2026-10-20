"use client";

import { useTranslations } from "next-intl";

import { HeaderAppearance } from "@/modules/features";
import { RealtimeStatusIndicator } from "@/modules/shared/realtime";
import { AppHeader } from "@/modules/shared/ui/shell";
import { PortalSwitcher } from "@/modules/widgets/portal-switcher";

import { AccountMenu } from "./account-menu";
import { CrmNotificationBell } from "./crm-notification-bell";
import { HeaderQuickActions } from "./header-quick-actions";
import { SearchTrigger } from "./search-trigger";

/**
 * Шапка CRM: слева клуб, справа поиск, действия у двери, уведомления, оформление и аккаунт. Раздел в шапке
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
                    <RealtimeStatusIndicator />
                    <SearchTrigger />
                    <HeaderQuickActions />
                    <CrmNotificationBell />
                    <HeaderAppearance />
                    <AccountMenu />
                </>
            }
        />
    );
}
