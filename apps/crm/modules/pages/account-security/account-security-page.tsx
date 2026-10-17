"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";

import { Button } from "@workspace/ui";

import { AccountSecurityContext, crmAccountSecurity } from "@/modules/entities/account-security";
import { findEmployeeMe } from "@/modules/entities/auth";
import { ROUTES } from "@/modules/shared/config/routes";
import { SecurityCard } from "@/modules/widgets/account-security";

/**
 * «Вход и безопасность» в CRM (TASK-738): тот же аккаунт, что в кабинете, поэтому страница вне
 * клуба (`/{язык}/account/security`). Без сессии CRM — на вход с возвратом сюда.
 */
export function AccountSecurityPage() {
    const t = useTranslations("account.page");
    const locale = useLocale();
    const router = useRouter();
    const queryClient = useQueryClient();
    const session = useQuery({
        queryKey: ["account-security-session"],
        queryFn: findEmployeeMe,
        retry: false,
    });

    useEffect(() => {
        if (session.data === null) {
            const back = `${window.location.pathname}${window.location.search}`;
            router.replace(`/${locale}${ROUTES.LOGIN}?from=${encodeURIComponent(back)}`);
        }
    }, [session.data, locale, router]);

    if (!session.data) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
        );
    }

    // кэш CRM принадлежит вышедшему аккаунту
    const onSignedOut = () => {
        queryClient.clear();
        router.replace(`/${locale}${ROUTES.LOGIN}`);
    };

    return (
        <div className="container max-w-3xl space-y-6 py-10">
            <Button asChild variant="ghost" size="sm" className="-ml-2">
                {/* вход CRM сам выбирает клуб сотрудника */}
                <Link href={`/${locale}${ROUTES.LOGIN}`}>
                    <ArrowLeft aria-hidden="true" />
                    {t("backToCrm")}
                </Link>
            </Button>
            <AccountSecurityContext.Provider value={crmAccountSecurity}>
                <SecurityCard onSignedOut={onSignedOut} />
            </AccountSecurityContext.Provider>
        </div>
    );
}
