"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

import { Loader2 } from "lucide-react";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { Card } from "@workspace/ui";

import { useAccountSecurity } from "@/modules/entities/account-security";

import { DevicesSection } from "./devices-section";
import { PasswordRow } from "./password-row";
import { RedirectProviderRow } from "./redirect-provider-row";
import { SignOutRow } from "./sign-out-row";
import { useLinkResult } from "./use-link-result";
import { WidgetProviderRow } from "./widget-provider-row";

/**
 * «Вход и безопасность» (TASK-716, TASK-738): пароль, способы входа из реестра API, устройства,
 * выход со всех устройств. Один виджет на CRM и кабинет: приложение даёт клиента через
 * `AccountSecurityContext` и решает, что делать после выхода (`onSignedOut`).
 */
export function SecurityCard({ onSignedOut }: { onSignedOut: () => void }) {
    const t = useTranslations("account.security");
    const security = useAccountSecurity();
    const { refetch } = security;
    const providers = security.data?.methods.map((method) => method.provider) ?? [];
    useLinkResult(
        providers,
        useCallback(() => void refetch(), [refetch])
    );

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
                    {security.data.methods.map((method) =>
                        method.flow === "redirect" ? (
                            <RedirectProviderRow
                                key={method.provider}
                                security={security.data}
                                method={method}
                            />
                        ) : (
                            <WidgetProviderRow
                                key={method.provider}
                                security={security.data}
                                method={method}
                            />
                        )
                    )}
                    <SignOutRow onSignedOut={onSignedOut} />
                </ul>
            )}
            {security.data && <DevicesSection />}
        </Card>
    );
}
