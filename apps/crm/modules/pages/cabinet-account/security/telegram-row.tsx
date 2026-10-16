"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { toast } from "sonner";

import { Button, ConfirmDialog } from "@workspace/ui";

import {
    type AccountSecurity,
    useLinkTelegram,
    useTelegramConfig,
    useUnlinkTelegram,
} from "@/modules/entities/cabinet-account";
import { useTelegramErrorText } from "@/modules/features/member-auth";
import { SettingRow } from "@/modules/shared/ui/SettingRow";
import { TelegramLoginButton } from "@/modules/shared/ui/TelegramLoginButton";

import { isLastSignInMethod } from "./sign-in-methods";

/**
 * Telegram как способ входа. Привязка — кнопкой виджета прямо здесь (почта у аккаунта уже есть),
 * отвязка — с подтверждением и только если остаётся другой способ входа. Бот не настроен — строки нет.
 */
export function TelegramRow({ security }: { security: AccountSecurity }) {
    const t = useTranslations("cabinet.account.security.telegram");
    const locale = useLocale();
    const config = useTelegramConfig();
    const link = useLinkTelegram();
    const unlink = useUnlinkTelegram();
    const errorText = useTelegramErrorText();
    const [confirm, setConfirm] = useState(false);
    const { linked, username } = security.telegram;
    const last = isLastSignInMethod(security, "telegram");

    const botUsername = config.data?.enabled ? config.data.botUsername : null;
    if (!botUsername && !linked) return null;

    const description = linked
        ? t("linkedAs", { username: username ? `@${username}` : t("noUsername") })
        : t("notLinked");

    return (
        <SettingRow
            title={t("title")}
            description={linked && last ? `${description} ${t("onlyWay")}` : description}
            error={link.error ? errorText(link.error) : undefined}
        >
            {linked ? (
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
                botUsername && (
                    <TelegramLoginButton
                        botUsername={botUsername}
                        locale={locale}
                        onAuth={(user) =>
                            link.mutate(user, { onSuccess: () => toast.success(t("linked")) })
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
                    unlink.mutate(undefined, {
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
