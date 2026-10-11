"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { CreditCard, Languages, LogOut, Settings, UserRound } from "lucide-react";

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
import { useChangeLocale } from "@/modules/features";
import { useAuth } from "@/modules/processes";
import { localeNames, locales } from "@/modules/shared/config/i18n";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";
import { useCrmLogout } from "@/modules/shared/ui/NavButtons";

const MANAGING_ROLES = new Set(["portal_owner", "admin"]);

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

/** Аватар: мой аккаунт, для владельца и админа — настройки и тариф, язык и выход. */
export function AccountMenu() {
    const t = useTranslations("crm.shell.account");
    const localizedLink = useLocalizedLink();
    const { currentUser } = useAuth();
    const { data: info } = usePortalInfo();
    const { locale, changeLocale } = useChangeLocale();
    const logout = useCrmLogout();

    const email = currentUser?.email;
    const role = currentUser?.employments.find(
        (employment) => employment.portalId === info?.portalId
    )?.role;
    const canManage = role !== undefined && MANAGING_ROLES.has(role);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("open")}
                    title={email}
                    className="rounded-full"
                >
                    <Avatar email={email} />
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
                {canManage && (
                    <>
                        <DropdownMenuItem asChild>
                            <Link href={localizedLink(ROUTES.CRM_SETTINGS)}>
                                <Settings />
                                {t("settings")}
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={localizedLink(ROUTES.CRM_SETTINGS_BILLING)}>
                                <CreditCard />
                                {t("billing")}
                            </Link>
                        </DropdownMenuItem>
                    </>
                )}
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
    );
}
