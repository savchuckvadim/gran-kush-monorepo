"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { toast } from "sonner";

import { Button, ConfirmDialog } from "@workspace/ui";

import {
    type AccountSecurity,
    type SignInMethod,
    useAccountSecurityClient,
    useAudienceProviders,
    useLinkWidgetProvider,
    useUnlinkProvider,
} from "@/modules/entities/account-security";
import { useTelegramErrorText } from "@/modules/features/member-auth";
import { SettingRow } from "@/modules/shared/ui/SettingRow";
import { TelegramLoginButton } from "@/modules/shared/ui/TelegramLoginButton";

import { isLastSignInMethod } from "./sign-in-methods";

interface WidgetProviderRowProps {
    security: AccountSecurity;
    method: SignInMethod;
}

/**
 * Виджет-провайдер (Telegram) как способ входа. Привязка — кнопкой виджета прямо здесь (почта у
 * аккаунта уже есть), отвязка — с подтверждением и только если остаётся другой способ входа.
 */
export function WidgetProviderRow({ security, method }: WidgetProviderRowProps) {
    const t = useTranslations(`account.security.${method.provider}`);
    const locale = useLocale();
    const client = useAccountSecurityClient();
    const providers = useAudienceProviders(client.audience);
    const link = useLinkWidgetProvider();
    const unlink = useUnlinkProvider();
    const errorText = useTelegramErrorText();
    const [confirm, setConfirm] = useState(false);
    const last = isLastSignInMethod(security, method.provider);

    const botId = providers.data?.find((p) => p.key === method.provider)?.config.botId;
    const description = method.linked
        ? t("linkedAs", { username: method.username ? `@${method.username}` : t("noUsername") })
        : t("notLinked");

    return (
        <SettingRow
            title={t("title")}
            description={method.linked && last ? `${description} ${t("onlyWay")}` : description}
            error={link.error ? errorText(link.error) : undefined}
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
                method.provider === "telegram" &&
                typeof botId === "number" && (
                    <TelegramLoginButton
                        botId={botId}
                        locale={locale}
                        label={t("link")}
                        size="sm"
                        disabled={link.isPending}
                        onAuth={(user) =>
                            link.mutate(
                                { provider: method.provider, payload: { ...user } },
                                { onSuccess: () => toast.success(t("linked")) }
                            )
                        }
                    />
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
                        onError: (error) => toast.error(errorText(error)),
                    })
                }
            />
        </SettingRow>
    );
}
