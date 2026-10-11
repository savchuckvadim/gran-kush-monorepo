"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiClientError, assertOpenApiOk, getApiErrorMessage } from "@workspace/api-client/core";
import { Button } from "@workspace/ui";

import { authKeys } from "@/modules/entities/auth";
import { $api } from "@/modules/shared";
import { ROUTES } from "@/modules/shared/config/routes";

import { isDeadTokenStatus } from "../lib/credentials";

import { ResendConfirmationButton } from "./resend-confirmation-button";

export function ConfirmEmailByToken({ token }: { token: string }) {
    const t = useTranslations("auth.confirmEmail");
    const locale = useLocale();
    const queryClient = useQueryClient();

    // A query, not a mutation: the token is single-use, and a query keyed by it runs once even
    // when StrictMode remounts the page (a mutation fired from an effect lost its result there)
    const confirmation = useQuery({
        queryKey: ["crm-confirm-email", token],
        queryFn: async () =>
            assertOpenApiOk(await $api.POST("/crm/auth/confirm-email", { body: { token } })),
        retry: false,
        staleTime: Infinity,
        gcTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });

    useEffect(() => {
        if (confirmation.isSuccess) {
            void queryClient.invalidateQueries({ queryKey: authKeys.current() });
        }
    }, [confirmation.isSuccess, queryClient]);

    // The login page sends a live session straight to its club
    const continueHref = `/${locale}${ROUTES.LOGIN}`;

    if (confirmation.isSuccess) {
        return (
            <div className="space-y-4">
                <p className="rounded-lg border bg-muted/40 p-4 text-sm">{t("success")}</p>
                <Button asChild className="w-full">
                    <Link href={continueHref}>{t("continue")}</Link>
                </Button>
            </div>
        );
    }

    if (confirmation.isError) {
        const linkIsDead =
            confirmation.error instanceof ApiClientError &&
            isDeadTokenStatus(confirmation.error.status);
        return (
            <div className="space-y-4">
                <p className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
                    {linkIsDead ? t("invalidLink") : getApiErrorMessage(confirmation.error)}
                </p>
                <ResendConfirmationButton />
                <Button asChild variant="ghost" className="w-full">
                    <Link href={continueHref}>{t("goToLogin")}</Link>
                </Button>
            </div>
        );
    }

    return <p className="text-center text-sm text-muted-foreground">{t("checking")}</p>;
}
