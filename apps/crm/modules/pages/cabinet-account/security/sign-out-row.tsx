"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";

import { Button, ConfirmDialog } from "@workspace/ui";

import { cabinetKeys, useSignOutEverywhere } from "@/modules/entities/cabinet-account";
import { useCabinetLinks } from "@/modules/processes/member-auth";
import { notifyApiError } from "@/modules/shared/lib/notify-api-error";
import { SettingRow } from "@/modules/shared/ui/SettingRow";

/**
 * Выйти на всех устройствах — если телефон потерян или вход был с чужого компьютера. Сессии
 * аккаунта снимаются и в CRM: аккаунт и пароль общие. Это устройство тоже выходит.
 */
export function SignOutRow() {
    const t = useTranslations("cabinet.account.security.signOut");
    const router = useRouter();
    const links = useCabinetLinks();
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
                            // кэш кабинета принадлежит вышедшему аккаунту
                            queryClient.removeQueries({ queryKey: cabinetKeys.all });
                            router.replace(links.login);
                        },
                        onError: (error) => notifyApiError(error),
                    })
                }
            />
        </SettingRow>
    );
}
