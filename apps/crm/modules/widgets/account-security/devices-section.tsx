"use client";

import { useTranslations } from "next-intl";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { Button } from "@workspace/ui";

import { useAccountSessions, useEndOtherSessions } from "@/modules/entities/account-security";
import { notifyApiError } from "@/modules/shared/lib/notify-api-error";

import { DeviceRow } from "./device-row";

/**
 * Устройства аккаунта (TASK-735): где открыт вход — и в CRM, и в кабинете. Чужое устройство
 * закрывается сразу (сессию проверяют на каждый запрос), это — выходом.
 */
export function DevicesSection() {
    const t = useTranslations("account.security.devices");
    const sessions = useAccountSessions();
    const endOthers = useEndOtherSessions();
    const others = sessions.data?.filter((session) => !session.current) ?? [];

    return (
        <section className="border-t">
            <div className="flex flex-col gap-2 px-4 pt-4 pb-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h3 className="font-medium">{t("title")}</h3>
                    <p className="text-sm text-muted-foreground">{t("hint")}</p>
                </div>
                {others.length > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={endOthers.isPending}
                        onClick={() =>
                            endOthers.mutate(undefined, {
                                onSuccess: (count) => toast.success(t("endedOthers", { count })),
                                onError: (error) => notifyApiError(error),
                            })
                        }
                    >
                        {t("endOthers")}
                    </Button>
                )}
            </div>
            {sessions.isLoading && (
                <Loader2 className="mx-4 my-3 size-5 animate-spin text-muted-foreground" />
            )}
            {sessions.error && (
                <p role="alert" className="px-4 pb-4 text-sm text-destructive">
                    {getApiErrorMessage(sessions.error)}
                </p>
            )}
            {sessions.data && (
                <ul className="divide-y">
                    {sessions.data.map((session) => (
                        <DeviceRow key={session.id} session={session} />
                    ))}
                </ul>
            )}
            {sessions.data && others.length === 0 && (
                <p className="px-4 pb-4 text-sm text-muted-foreground">{t("none")}</p>
            )}
        </section>
    );
}
