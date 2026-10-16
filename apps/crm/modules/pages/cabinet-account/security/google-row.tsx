"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { toast } from "sonner";

import { Button, ConfirmDialog } from "@workspace/ui";

import { type AccountSecurity, useUnlinkGoogle } from "@/modules/entities/cabinet-account";
import { googleLinkUrl } from "@/modules/shared/api/google-sign-in";
import { notifyApiError } from "@/modules/shared/lib/notify-api-error";
import { GoogleMark } from "@/modules/shared/ui/GoogleButton";
import { SettingRow } from "@/modules/shared/ui/SettingRow";

/**
 * Google как способ входа. Привязка — переход на Google и обратно (страница сообщит исход),
 * отвязка — с подтверждением и только при заданном пароле: иначе войти было бы нечем.
 */
export function GoogleRow({ security }: { security: AccountSecurity }) {
    const t = useTranslations("cabinet.account.security.google");
    const locale = useLocale();
    const unlink = useUnlinkGoogle();
    const [confirm, setConfirm] = useState(false);
    const { linked, email } = security.google;

    const description = linked ? t("linkedAs", { email: email ?? "" }) : t("notLinked");

    return (
        <SettingRow
            title={t("title")}
            description={
                linked && !security.hasPassword ? `${description} ${t("onlyWay")}` : description
            }
        >
            {linked ? (
                <Button
                    variant="outline"
                    size="sm"
                    disabled={!security.hasPassword || unlink.isPending}
                    title={security.hasPassword ? undefined : t("onlyWay")}
                    onClick={() => setConfirm(true)}
                >
                    {t("unlink")}
                </Button>
            ) : (
                <Button asChild variant="outline" size="sm">
                    <a href={googleLinkUrl(locale)}>
                        <GoogleMark />
                        {t("link")}
                    </a>
                </Button>
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
                        onError: (error) => notifyApiError(error),
                    })
                }
            />
        </SettingRow>
    );
}
