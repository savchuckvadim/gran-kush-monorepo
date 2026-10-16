"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

import { Loader2 } from "lucide-react";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { Card } from "@workspace/ui";

import { useAccountSecurity } from "@/modules/entities/cabinet-account";

import { GoogleRow } from "./google-row";
import { PasswordRow } from "./password-row";
import { SignOutRow } from "./sign-out-row";
import { useGoogleLinkResult } from "./use-google-link-result";

/** «Вход и безопасность»: пароль, Google, выход со всех устройств (TASK-716). */
export function SecurityCard() {
    const t = useTranslations("cabinet.account.security");
    const security = useAccountSecurity();
    const { refetch } = security;
    useGoogleLinkResult(useCallback(() => void refetch(), [refetch]));

    return (
        <Card className="gap-0 py-0">
            <div className="space-y-1 px-4 pt-4 pb-2">
                <h2 className="text-lg font-medium">{t("title")}</h2>
                <p className="text-sm text-muted-foreground">{t("hint")}</p>
            </div>
            {security.isLoading && (
                <Loader2 className="mx-4 my-3 size-5 animate-spin text-muted-foreground" />
            )}
            {security.error && (
                <p role="alert" className="px-4 pb-4 text-sm text-destructive">
                    {getApiErrorMessage(security.error)}
                </p>
            )}
            {security.data && (
                <ul className="divide-y">
                    <PasswordRow hasPassword={security.data.hasPassword} />
                    <GoogleRow security={security.data} />
                    <SignOutRow />
                </ul>
            )}
        </Card>
    );
}
