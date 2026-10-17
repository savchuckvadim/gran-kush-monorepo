"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Palette } from "lucide-react";

import { accountSecurityKeys } from "@/modules/entities/account-security";
import { cabinetKeys, logoutMember } from "@/modules/entities/cabinet-account";
import { SkinPickerSheet, useChangeLocale } from "@/modules/features";
import { useCabinetLinks, useMemberAuth } from "@/modules/processes/member-auth";
import { crmAppUrl } from "@/modules/shared/config/app-urls";
import { ROUTES } from "@/modules/shared/config/routes";
import {
    AccountAvatar,
    AccountCard,
    AccountTileButton,
    AccountTileLink,
    LanguageTile,
} from "@/modules/shared/ui/AccountCard";

/**
 * Аккаунт участника — та же карточка, что у сотрудника в CRM: переход в CRM (если аккаунт ещё и
 * сотрудник), оформление, язык, выход. Выход сбрасывает кэш кабинета и уводит на вход; сессия
 * CRM при этом остаётся — у неё свои куки.
 */
export function MemberAccountMenu() {
    const t = useTranslations("cabinet.shell");
    const { user } = useMemberAuth();
    const links = useCabinetLinks();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { locale, changeLocale } = useChangeLocale();
    // the sheet lives next to the menu, not inside it: picking the tile closes the menu
    const [isSkinsOpen, setIsSkinsOpen] = useState(false);
    // Вход CRM сам выбирает клуб сотрудника: открыть его и есть «перейти в CRM»
    const crmHref = user.hasEmployments ? crmAppUrl(`/${locale}${ROUTES.LOGIN}`) : null;

    const logout = useMutation({
        mutationFn: logoutMember,
        onSettled: () => {
            // Кэш кабинета принадлежит ушедшему аккаунту: остаться в нём нельзя
            queryClient.removeQueries({ queryKey: cabinetKeys.all });
            queryClient.removeQueries({ queryKey: accountSecurityKeys.all("cabinet") });
            router.replace(links.login);
        },
    });

    return (
        <>
            <AccountCard
                email={user.email}
                subtitle={t("subtitle")}
                logout={{
                    label: t("logout"),
                    pending: logout.isPending,
                    onSelect: () => logout.mutate(),
                }}
                trigger={
                    <button
                        type="button"
                        data-slot="account-capsule"
                        aria-label={t("account")}
                        title={user.email}
                        className="flex items-center rounded-full p-1 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                        <AccountAvatar email={user.email} className="size-8 text-sm" />
                    </button>
                }
            >
                {crmHref && (
                    <AccountTileLink href={crmHref} icon={Briefcase} label={t("openCrm")} />
                )}
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
