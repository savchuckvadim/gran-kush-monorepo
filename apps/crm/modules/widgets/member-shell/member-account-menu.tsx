"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Briefcase, LogOut } from "lucide-react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@workspace/ui";

import { logoutMember } from "@/modules/entities/cabinet-account";
import { useChangeLocale } from "@/modules/features/lang-switcher/use-change-locale";
import { useCabinetLinks, useMemberAuth } from "@/modules/processes/member-auth";
import { crmAppUrl } from "@/modules/shared/config/app-urls";
import { localeNames, locales } from "@/modules/shared/config/i18n";
import { ROUTES } from "@/modules/shared/config/routes";

/**
 * Аккаунт участника: почта, переход в CRM (если аккаунт ещё и сотрудник), язык, выход. Выход
 * сбрасывает кэш кабинета и уводит на вход; сессия CRM при этом остаётся — у неё свои куки.
 */
export function MemberAccountMenu() {
    const t = useTranslations("cabinet.shell");
    const { user } = useMemberAuth();
    const links = useCabinetLinks();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { locale, changeLocale } = useChangeLocale();
    // Вход CRM сам выбирает клуб сотрудника: открыть его и есть «перейти в CRM»
    const crmHref = user.hasEmployments ? crmAppUrl(`/${locale}${ROUTES.LOGIN}`) : null;

    const logout = useMutation({
        mutationFn: logoutMember,
        onSettled: () => {
            // Кэш кабинета принадлежит ушедшему аккаунту: остаться в нём нельзя
            queryClient.removeQueries({ queryKey: ["cabinet"] });
            router.replace(links.login);
        },
    });

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    data-slot="account-capsule"
                    aria-label={t("account")}
                    title={user.email}
                    className="flex items-center rounded-full p-1 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                    <span
                        aria-hidden="true"
                        className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
                    >
                        {user.email.charAt(0).toUpperCase()}
                    </span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-64">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {crmHref && (
                    <>
                        <DropdownMenuItem asChild>
                            <a href={crmHref}>
                                <Briefcase />
                                {t("openCrm")}
                            </a>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                    </>
                )}
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    {t("language")}
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup value={locale} onValueChange={changeLocale}>
                    {locales.map((item) => (
                        <DropdownMenuRadioItem key={item} value={item}>
                            {localeNames[item]}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
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
