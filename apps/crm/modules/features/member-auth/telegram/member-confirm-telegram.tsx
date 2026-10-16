"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2, XCircle } from "lucide-react";

import { Button } from "@workspace/ui";

import { cabinetKeys, confirmTelegramEmail } from "@/modules/entities/cabinet-account";
import { useCabinetLinks } from "@/modules/processes/member-auth";
import { useMountAction } from "@/modules/shared/lib/use-mount-action";

import { useTelegramErrorText } from "./use-telegram-error-text";

/**
 * Ссылка из письма после первого входа через Telegram: подтверждение запускается один раз при
 * открытии, затем — в кабинет уже с сессией.
 */
export function MemberConfirmTelegram({ token }: { token: string }) {
    const t = useTranslations("cabinet.auth.telegram.confirm");
    const links = useCabinetLinks();
    const router = useRouter();
    const queryClient = useQueryClient();
    const errorText = useTelegramErrorText();
    const confirm = useMountAction(async () => {
        await confirmTelegramEmail(token);
        await queryClient.invalidateQueries({ queryKey: cabinetKeys.all });
        router.replace(links.home);
    });

    if (confirm.status === "error") {
        return (
            <div className="space-y-4 text-center" role="alert">
                <XCircle className="mx-auto size-10 text-destructive" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">{errorText(confirm.error)}</p>
                <Button variant="outline" asChild className="w-full">
                    <Link href={links.login}>{t("toLogin")}</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {t("working")}
        </div>
    );
}
