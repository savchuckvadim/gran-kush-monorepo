"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { useQueryClient } from "@tanstack/react-query";

import {
    cabinetKeys,
    useTelegramConfig,
    useTelegramSignIn,
} from "@/modules/entities/cabinet-account";
import { TelegramLoginButton } from "@/modules/shared/ui/TelegramLoginButton";

import { TelegramEmailDialog } from "./telegram-email-dialog";
import { useTelegramErrorText } from "./use-telegram-error-text";

/**
 * «Войти через Telegram» под формой входа и регистрации кабинета. Привязанный Telegram входит
 * сразу и уводит на `returnTo`; новый открывает шаг «укажите почту». Бот не настроен — кнопки нет.
 */
export function TelegramSignIn({ returnTo }: { returnTo: string }) {
    const t = useTranslations("cabinet.auth.telegram");
    const locale = useLocale();
    const router = useRouter();
    const queryClient = useQueryClient();
    const config = useTelegramConfig();
    const signIn = useTelegramSignIn();
    const errorText = useTelegramErrorText();
    const [ticket, setTicket] = useState<string | null>(null);

    const botId = config.data?.enabled ? config.data.botId : null;
    if (!botId) return null;

    return (
        <div className="space-y-2">
            <TelegramLoginButton
                botId={botId}
                locale={locale}
                label={t("button")}
                className="w-full"
                disabled={signIn.isPending}
                onAuth={(user) =>
                    signIn.mutate(user, {
                        onSuccess: (result) => {
                            if (result.status === "signed_in") {
                                void queryClient.invalidateQueries({ queryKey: cabinetKeys.all });
                                router.replace(returnTo);
                            } else if (result.ticket) {
                                setTicket(result.ticket);
                            }
                        },
                    })
                }
            />
            {signIn.isPending && (
                <p className="text-center text-sm text-muted-foreground">{t("signingIn")}</p>
            )}
            {signIn.error && (
                <p role="alert" className="text-center text-sm text-destructive">
                    {errorText(signIn.error)}
                </p>
            )}
            <TelegramEmailDialog ticket={ticket} onClose={() => setTicket(null)} />
        </div>
    );
}
