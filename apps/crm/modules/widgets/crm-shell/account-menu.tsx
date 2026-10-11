"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { Languages, LogOut, Moon, Palette, Sun, UserRound } from "lucide-react";

import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@workspace/ui";

import { usePortalInfo } from "@/modules/entities/portal";
import { SkinPickerSheet, useChangeLocale } from "@/modules/features";
import { useAuth } from "@/modules/processes";
import { localeNames, locales } from "@/modules/shared/config/i18n";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";
import { useCrmLogout } from "@/modules/shared/ui/NavButtons";

function Avatar({ email }: { email?: string }) {
    return (
        <span
            aria-hidden="true"
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
        >
            {email ? email.charAt(0).toUpperCase() : "?"}
        </span>
    );
}

/** Профиль, оформление, режим, язык и выход — в одном меню аватара. */
export function AccountMenu() {
    const t = useTranslations("crm.shell.account");
    const tMode = useTranslations("crm.appearance.mode");
    const localizedLink = useLocalizedLink();
    const { currentUser } = useAuth();
    const { data: info } = usePortalInfo();
    const { resolvedTheme, setTheme, forcedTheme } = useTheme();
    const { locale, changeLocale } = useChangeLocale();
    const logout = useCrmLogout();
    const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);

    const email = currentUser?.email;
    const role = currentUser?.employments.find(
        (employment) => employment.portalId === info?.portalId
    )?.role;
    const isDark = (forcedTheme ?? resolvedTheme) === "dark";

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        aria-label={t("open")}
                        className="gap-2 rounded-full px-1 xl:pr-3"
                    >
                        <Avatar email={email} />
                        <span className="hidden max-w-44 truncate font-normal xl:block">
                            {email}
                        </span>
                    </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel className="flex items-center gap-2.5 font-normal">
                        <Avatar email={email} />
                        <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{email}</span>
                            {role && (
                                <span className="text-muted-foreground block text-xs">
                                    {t(`roles.${role}`)}
                                </span>
                            )}
                        </span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem asChild>
                        <Link href={localizedLink(ROUTES.CRM_PROFILE)}>
                            <UserRound />
                            {t("profile")}
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setIsAppearanceOpen(true)}>
                        <Palette />
                        {t("appearance")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        disabled={Boolean(forcedTheme)}
                        title={forcedTheme ? tMode("single") : undefined}
                        onSelect={(event) => {
                            event.preventDefault();
                            setTheme(isDark ? "light" : "dark");
                        }}
                    >
                        {isDark ? <Sun /> : <Moon />}
                        {isDark ? t("lightMode") : t("darkMode")}
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Languages />
                            {t("language")}
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
                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                        variant="destructive"
                        disabled={logout.isPending}
                        onSelect={() => logout.mutate()}
                    >
                        <LogOut />
                        {t("logout")}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <SkinPickerSheet open={isAppearanceOpen} onOpenChange={setIsAppearanceOpen} />
        </>
    );
}
