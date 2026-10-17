"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { CreditCard, IdCard, Palette, Plus, Settings, ShieldCheck, UserRound } from "lucide-react";

import { SETTINGS_PERMISSIONS, usePermissions, useRoleLabel } from "@/modules/entities/access";
import { usePortalInfo } from "@/modules/entities/portal";
import { SkinPickerSheet, useChangeLocale } from "@/modules/features";
import { useAuth } from "@/modules/processes";
import { cabinetAppUrl } from "@/modules/shared/config/app-urls";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";
import {
    AccountAvatar,
    AccountCard,
    AccountTileButton,
    AccountTileLink,
    LanguageTile,
} from "@/modules/shared/ui/AccountCard";
import { useCrmLogout } from "@/modules/shared/ui/NavButtons";

import { HeaderClock } from "./header-clock";

/**
 * Капсула аккаунта сотрудника: часы, дата и аватар; по клику — карточка аккаунта (как у Bitrix24
 * у аватара): профиль, настройки и оплата для администратора, кабинет участника, новый клуб,
 * оформление и язык.
 */
export function AccountMenu() {
    const t = useTranslations("crm.shell.account");
    const localizedLink = useLocalizedLink();
    const { currentUser } = useAuth();
    const { locale, changeLocale } = useChangeLocale();
    const logout = useCrmLogout();
    // the sheet lives next to the menu, not inside it: picking the tile closes the menu
    const [isSkinsOpen, setIsSkinsOpen] = useState(false);

    const { data: info } = usePortalInfo();
    const { role, can } = usePermissions();
    const roleLabel = useRoleLabel();
    const canOpenSettings = SETTINGS_PERMISSIONS.some((code) => can(code));
    const email = currentUser?.email;
    // Аккаунт ещё и участник клуба: его кабинет на club. — та же персона в другой роли
    const cabinetHref = currentUser?.hasMemberships ? cabinetAppUrl(`/${locale}`) : null;

    return (
        <>
            <AccountCard
                email={email}
                subtitle={[role && roleLabel(role), info?.displayName].filter(Boolean).join(" · ")}
                logout={{
                    label: t("logout"),
                    pending: logout.isPending,
                    onSelect: () => logout.mutate(),
                }}
                trigger={
                    <button
                        type="button"
                        data-slot="account-capsule"
                        aria-label={t("open")}
                        title={email}
                        className="flex items-center gap-2 rounded-full p-1 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 md:py-1 md:pr-1 md:pl-3"
                    >
                        <HeaderClock className="hidden md:flex" />
                        <AccountAvatar email={email} />
                    </button>
                }
            >
                <AccountTileLink
                    href={localizedLink(ROUTES.CRM_PROFILE)}
                    icon={UserRound}
                    label={t("profile")}
                />
                {/* the account is the same in every club: no portal prefix */}
                <AccountTileLink
                    href={`/${locale}${ROUTES.ACCOUNT_SECURITY}`}
                    icon={ShieldCheck}
                    label={t("security")}
                />
                {canOpenSettings && (
                    <AccountTileLink
                        href={localizedLink(ROUTES.CRM_SETTINGS)}
                        icon={Settings}
                        label={t("settings")}
                    />
                )}
                {can("billing.manage") && (
                    <AccountTileLink
                        href={localizedLink(ROUTES.CRM_SETTINGS_BILLING)}
                        icon={CreditCard}
                        label={t("billing")}
                    />
                )}
                {cabinetHref && (
                    <AccountTileLink href={cabinetHref} icon={IdCard} label={t("cabinet")} />
                )}
                {/* the new club lives outside any club: no portal prefix in its address */}
                <AccountTileLink
                    href={`/${locale}${ROUTES.NEW_CLUB}`}
                    icon={Plus}
                    label={t("newClub")}
                />
                <AccountTileButton
                    icon={Palette}
                    label={t("appearance")}
                    onSelect={() => setIsSkinsOpen(true)}
                />
                <LanguageTile label={t("language")} locale={locale} onChange={changeLocale} />
            </AccountCard>
            <SkinPickerSheet open={isSkinsOpen} onOpenChange={setIsSkinsOpen} />
        </>
    );
}
