"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { toast } from "sonner";

import { Button, ConfirmDialog } from "@workspace/ui";

import {
    type AccountSecurity,
    type SignInMethod,
    useAccountSecurityClient,
    useUnlinkProvider,
} from "@/modules/entities/account-security";
import { notifyApiError } from "@/modules/shared/lib/notify-api-error";
import { GoogleMark } from "@/modules/shared/ui/GoogleButton";
import { SettingRow } from "@/modules/shared/ui/SettingRow";

import { isLastSignInMethod } from "./sign-in-methods";

interface RedirectProviderRowProps {
    security: AccountSecurity;
    method: SignInMethod;
}

/**
 * Редирект-провайдер (Google) как способ входа. Привязка — переход к провайдеру и обратно (страница
 * сообщит исход), отвязка — с подтверждением и только если остаётся другой способ входа.
 */
export function RedirectProviderRow({ security, method }: RedirectProviderRowProps) {
    const t = useTranslations(`account.security.${method.provider}`);
    const locale = useLocale();
    const client = useAccountSecurityClient();
    const unlink = useUnlinkProvider();
    const [confirm, setConfirm] = useState(false);
    const last = isLastSignInMethod(security, method.provider);

    const description = method.linked
        ? t("linkedAs", { email: method.email ?? "" })
        : t("notLinked");

    return (
        <SettingRow
            title={t("title")}
            description={method.linked && last ? `${description} ${t("onlyWay")}` : description}
        >
            {method.linked ? (
                <Button
                    variant="outline"
                    size="sm"
                    disabled={last || unlink.isPending}
                    title={last ? t("onlyWay") : undefined}
                    onClick={() => setConfirm(true)}
                >
                    {t("unlink")}
                </Button>
            ) : (
                method.available && (
                    <Button asChild variant="outline" size="sm">
                        <a href={client.linkUrl(method.provider, locale)}>
                            {method.provider === "google" && <GoogleMark />}
                            {t("link")}
                        </a>
                    </Button>
                )
            )}
            <ConfirmDialog
                open={confirm}
                onOpenChange={setConfirm}
                title={t("unlinkTitle")}
                description={t("unlinkDescription")}
                confirmLabel={t("unlink")}
                cancelLabel={t("cancel")}
                tone="destructive"
                pending={unlink.isPending}
                onConfirm={() =>
                    unlink.mutate(method.provider, {
                        onSuccess: () => {
                            setConfirm(false);
                            toast.success(t("unlinked"));
                        },
                        onError: (error) => notifyApiError(error),
                    })
                }
            />
        </SettingRow>
    );
}
