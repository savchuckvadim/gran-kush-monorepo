"use client";

import { useTranslations } from "next-intl";

import { Switch } from "@workspace/ui";

import {
    type NotificationApp,
    useNotificationPreferences,
    useSetTelegramNotifications,
} from "@/modules/entities/notification";

/** «Дублировать в Telegram» — только у аккаунта с входом через Telegram: иначе писать некуда. */
export function NotificationTelegramToggle({
    app,
    club,
}: {
    app: NotificationApp;
    club: string | null;
}) {
    const t = useTranslations("common.notifications");
    const preferences = useNotificationPreferences(app, club, true);
    const save = useSetTelegramNotifications(app, club);
    if (!preferences.data?.telegramLinked) return null;

    return (
        <label className="flex items-center justify-between gap-3 border-t px-3 pt-3 text-sm">
            <span>
                <span className="block">{t("telegram")}</span>
                <span className="block text-xs text-muted-foreground">{t("telegramHint")}</span>
            </span>
            <Switch
                checked={preferences.data.telegram}
                onCheckedChange={(telegram) => save.mutate(telegram)}
                disabled={save.isPending}
                aria-label={t("telegram")}
            />
        </label>
    );
}
