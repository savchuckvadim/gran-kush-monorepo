"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { useMutation, useQueryClient } from "@tanstack/react-query";

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
    const started = useRef(false);

    const mutation = useMutation({
        mutationFn: async () =>
            assertOpenApiOk(await $api.POST("/crm/auth/confirm-email", { body: { token } })),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.current() }),
    });

    useEffect(() => {
        // The token is single-use: a second request (StrictMode re-runs effects) would get 404
        if (started.current) {
            return;
        }
        started.current = true;
        mutation.mutate();
    }, [mutation]);

    // The login page sends a live session straight to its club
    const continueHref = `/${locale}${ROUTES.LOGIN}`;

    if (mutation.isSuccess) {
        return (
            <div className="space-y-4">
                <p className="rounded-lg border bg-muted/40 p-4 text-sm">{t("success")}</p>
                <Button asChild className="w-full">
                    <Link href={continueHref}>{t("continue")}</Link>
                </Button>
            </div>
        );
    }

    if (mutation.isError) {
        const linkIsDead =
            mutation.error instanceof ApiClientError && isDeadTokenStatus(mutation.error.status);
        return (
            <div className="space-y-4">
                <p className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
                    {linkIsDead ? t("invalidLink") : getApiErrorMessage(mutation.error)}
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
