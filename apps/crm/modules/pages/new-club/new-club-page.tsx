"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Card } from "@workspace/ui";

import { findEmployeeMe } from "@/modules/entities/auth";
import { CreateClubForm } from "@/modules/features/club-founding";
import { ROUTES } from "@/modules/shared/config/routes";

/**
 * «Новый клуб» для вошедшего аккаунта (вне клуба, `/{язык}/clubs/new`). Без сессии CRM — на вход
 * с возвратом сюда же, вместе с `?plan=` с сайта.
 */
export function NewClubPage() {
    const t = useTranslations("auth.newClub");
    const locale = useLocale();
    const router = useRouter();
    const session = useQuery({
        queryKey: ["new-club-session"],
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

    return (
        <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
            <Card
                className="w-full max-w-2xl"
                title={t("title")}
                description={t("subtitle", { email: session.data.email })}
                headerClassName="text-center"
            >
                <CreateClubForm />
            </Card>
        </div>
    );
}
