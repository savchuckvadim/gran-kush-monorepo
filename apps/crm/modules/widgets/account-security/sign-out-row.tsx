"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";

import { Button, ConfirmDialog } from "@workspace/ui";

import {
    accountSecurityKeys,
    useAccountSecurityClient,
    useSignOutEverywhere,
} from "@/modules/entities/account-security";
import { notifyApiError } from "@/modules/shared/lib/notify-api-error";
import { SettingRow } from "@/modules/shared/ui/SettingRow";

/**
 * Выйти на всех устройствах — если телефон потерян или вход был с чужого компьютера. Сессии
 * аккаунта снимаются и в CRM, и в кабинете: аккаунт и пароль общие. Это устройство тоже выходит;
 * что делать дальше (сбросить кэш, увести на вход), решает приложение — `onSignedOut`.
 */
export function SignOutRow({ onSignedOut }: { onSignedOut: () => void }) {
    const t = useTranslations("account.security.signOut");
    const client = useAccountSecurityClient();
    const queryClient = useQueryClient();
    const signOut = useSignOutEverywhere();
    const [confirm, setConfirm] = useState(false);

    return (
        <SettingRow title={t("title")} description={t("description")}>
            <Button variant="outline" size="sm" onClick={() => setConfirm(true)}>
                <LogOut aria-hidden="true" />
                {t("action")}
            </Button>
            <ConfirmDialog
                open={confirm}
                onOpenChange={setConfirm}
                title={t("confirmTitle")}
                description={t("confirmDescription")}
                confirmLabel={t("action")}
                cancelLabel={t("cancel")}
                tone="destructive"
                pending={signOut.isPending}
                onConfirm={() =>
                    signOut.mutate(undefined, {
                        onSuccess: () => {
                            // способы входа и устройства принадлежат вышедшему аккаунту
                            queryClient.removeQueries({
                                queryKey: accountSecurityKeys.all(client.audience),
                            });
                            onSignedOut();
                        },
                        onError: (error) => notifyApiError(error),
                    })
                }
            />
        </SettingRow>
    );
}
