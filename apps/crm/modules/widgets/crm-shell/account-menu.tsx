"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import type { LucideIcon } from "lucide-react";
import { CreditCard, Languages, LogOut, Palette, Settings, UserRound } from "lucide-react";

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

import { usePortalInfo } from "@/modules/entities/portal";
import { SkinPickerSheet, useChangeLocale } from "@/modules/features";
import { useAuth } from "@/modules/processes";
import { localeNames, locales } from "@/modules/shared/config/i18n";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";
import { useCrmLogout } from "@/modules/shared/ui/NavButtons";

import { HeaderClock } from "./header-clock";

const MANAGING_ROLES = new Set(["portal_owner", "admin"]);

function Avatar({ email, className }: { email?: string; className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground",
                className
            )}
        >
            {email ? email.charAt(0).toUpperCase() : "?"}
        </span>
    );
}

/** A tile of the account card: icon on top, label under it. */
const TILE =
    "relative flex h-auto flex-col items-start gap-2 rounded-xl border border-transparent p-3 text-sm [&_svg:not([class*='size-'])]:size-5 focus:border-border";

function TileLink({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
    return (
        <DropdownMenuItem asChild className={TILE}>
            <Link href={href}>
                <Icon />
                <span className="font-medium">{label}</span>
            </Link>
        </DropdownMenuItem>
    );
}

/**
 * Капсула аккаунта: часы, дата и аватар; по клику — карточка аккаунта. На десктопе — широкая
 * стеклянная карточка с плитками (как у Bitrix24 у аватара), на телефоне — узкая, в одну колонку.
 */
export function AccountMenu() {
    const t = useTranslations("crm.shell.account");
    const localizedLink = useLocalizedLink();
    const { currentUser } = useAuth();
    const { data: info } = usePortalInfo();
    const { locale, changeLocale } = useChangeLocale();
    const logout = useCrmLogout();
    // the sheet lives next to the menu, not inside it: picking the tile closes the menu
    const [isSkinsOpen, setIsSkinsOpen] = useState(false);

    const email = currentUser?.email;
    const role = currentUser?.employments.find(
        (employment) => employment.portalId === info?.portalId
    )?.role;
    const canManage = role !== undefined && MANAGING_ROLES.has(role);

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
                        <Avatar email={email} />
                    </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                    align="end"
                    sideOffset={8}
                    data-slot="account-card"
                    className="w-[min(18rem,calc(100vw-1.5rem))] p-0 md:w-[24rem]"
                >
                    <div className="flex items-center gap-3 border-b p-4">
                        <Avatar email={email} className="size-11 text-base" />
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
                        <TileLink
                            href={localizedLink(ROUTES.CRM_PROFILE)}
                            icon={UserRound}
                            label={t("profile")}
                        />
                        {canManage && (
                            <>
                                <TileLink
                                    href={localizedLink(ROUTES.CRM_SETTINGS)}
                                    icon={Settings}
                                    label={t("settings")}
                                />
                                <TileLink
                                    href={localizedLink(ROUTES.CRM_SETTINGS_BILLING)}
                                    icon={CreditCard}
                                    label={t("billing")}
                                />
                            </>
                        )}
                        <DropdownMenuItem className={TILE} onSelect={() => setIsSkinsOpen(true)}>
                            <Palette />
                            <span className="font-medium">{t("appearance")}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                            {/* the sub-trigger's own chevron goes to the tile's corner */}
                            <DropdownMenuSubTrigger
                                className={cn(
                                    TILE,
                                    "[&>svg:last-child]:absolute [&>svg:last-child]:top-3 [&>svg:last-child]:right-3"
                                )}
                            >
                                <Languages />
                                <span className="font-medium">{t("language")}</span>
                                <span className="text-muted-foreground -mt-1.5 text-xs">
                                    {localeNames[locale as keyof typeof localeNames]}
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
