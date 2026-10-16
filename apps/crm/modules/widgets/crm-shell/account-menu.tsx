"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { CreditCard, Languages, LogOut, Palette, Plus, Settings, UserRound } from "lucide-react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import { usePortalInfo, usePortalRole } from "@/modules/entities/portal";
import { SkinPickerSheet, useChangeLocale } from "@/modules/features";
import { useAuth } from "@/modules/processes";
import { localeNames, locales } from "@/modules/shared/config/i18n";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";
import { useCrmLogout } from "@/modules/shared/ui/NavButtons";

import { AccountAvatar } from "./account-avatar";
import { ACCOUNT_TILE, AccountTileLink } from "./account-tile";
import { HeaderClock } from "./header-clock";

/**
 * Капсула аккаунта: часы, дата и аватар; по клику — карточка аккаунта. На десктопе — широкая
 * стеклянная карточка с плитками (как у Bitrix24 у аватара), на телефоне — узкая, в одну колонку.
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
    const { role, isAdmin: canManage } = usePortalRole();
    const email = currentUser?.email;

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
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
                </DropdownMenuTrigger>

                <DropdownMenuContent
                    align="end"
                    sideOffset={8}
                    data-slot="account-card"
                    className="w-[min(18rem,calc(100vw-1.5rem))] p-0 md:w-[24rem]"
                >
                    <div className="flex items-center gap-3 border-b p-4">
                        <AccountAvatar email={email} className="size-11 text-base" />
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{email}</p>
                            <p className="text-muted-foreground mt-0.5 truncate text-xs">
                                {[role && t(`roles.${role}`), info?.displayName]
                                    .filter(Boolean)
                                    .join(" · ")}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-1 p-2 md:grid-cols-2">
                        <AccountTileLink
                            href={localizedLink(ROUTES.CRM_PROFILE)}
                            icon={UserRound}
                            label={t("profile")}
                        />
                        {canManage && (
                            <>
                                <AccountTileLink
                                    href={localizedLink(ROUTES.CRM_SETTINGS)}
                                    icon={Settings}
                                    label={t("settings")}
                                />
                                <AccountTileLink
                                    href={localizedLink(ROUTES.CRM_SETTINGS_BILLING)}
                                    icon={CreditCard}
                                    label={t("billing")}
                                />
                            </>
                        )}
                        {/* the new club lives outside any club: no portal prefix in its address */}
                        <AccountTileLink
                            href={`/${locale}${ROUTES.NEW_CLUB}`}
                            icon={Plus}
                            label={t("newClub")}
                        />
                        <DropdownMenuItem
                            className={ACCOUNT_TILE}
                            onSelect={() => setIsSkinsOpen(true)}
                        >
                            <Palette />
                            <span className="font-medium">{t("appearance")}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                            {/* the sub-trigger's own chevron goes to the tile's right edge */}
                            <DropdownMenuSubTrigger
                                className={cn(ACCOUNT_TILE, "[&>svg:last-child]:ml-auto")}
                            >
                                <Languages />
                                <span className="flex min-w-0 flex-col">
                                    <span className="font-medium">{t("language")}</span>
                                    <span className="text-muted-foreground text-xs">
                                        {localeNames[locale as keyof typeof localeNames]}
                                    </span>
                                </span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                <DropdownMenuRadioGroup value={locale} onValueChange={changeLocale}>
                                    {locales.map((item) => (
                                        <DropdownMenuRadioItem key={item} value={item}>
                                            {localeNames[item]}
                                        </DropdownMenuRadioItem>
                                    ))}
                                </DropdownMenuRadioGroup>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    </div>

                    <div className="border-t p-2">
                        <DropdownMenuItem
                            variant="destructive"
                            disabled={logout.isPending}
                            onSelect={() => logout.mutate()}
                            className="rounded-xl px-3 py-2.5"
                        >
                            <LogOut />
                            {t("logout")}
                        </DropdownMenuItem>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
            <SkinPickerSheet open={isSkinsOpen} onOpenChange={setIsSkinsOpen} />
        </>
    );
}
