"use client";

import { useTranslations } from "next-intl";

import { HeaderAppearance } from "@/modules/features";
import { RealtimeStatusIndicator } from "@/modules/shared/realtime";
import { AppHeader } from "@/modules/shared/ui/shell";

import { ClubSwitcher } from "./club-switcher";
import { MemberAccountMenu } from "./member-account-menu";
import { MemberNotificationBell } from "./member-notification-bell";

/** Шапка кабинета: клуб слева; уведомления клуба, оформление и меню аккаунта справа. */
export function MemberHeader() {
    const t = useTranslations("cabinet.shell");
    return (
        <AppHeader
            labels={{ openMenu: t("openMenu"), closeMenu: t("closeMenu") }}
            start={<ClubSwitcher />}
            end={
                <>
                    <RealtimeStatusIndicator />
                    <MemberNotificationBell />
                    <HeaderAppearance />
                    <MemberAccountMenu />
                </>
            }
        />
    );
}
