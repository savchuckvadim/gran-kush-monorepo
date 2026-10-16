"use client";

import { useTranslations } from "next-intl";

import { HeaderAppearance } from "@/modules/features";
import { AppHeader } from "@/modules/shared/ui/shell";

import { ClubSwitcher } from "./club-switcher";
import { MemberAccountMenu } from "./member-account-menu";

/** Шапка кабинета: клуб слева; оформление и меню аккаунта справа. */
export function MemberHeader() {
    const t = useTranslations("cabinet.shell");
    return (
        <AppHeader
            labels={{ openMenu: t("openMenu"), closeMenu: t("closeMenu") }}
            start={<ClubSwitcher />}
            end={
                <>
                    <HeaderAppearance />
                    <MemberAccountMenu />
                </>
            }
        />
    );
}
