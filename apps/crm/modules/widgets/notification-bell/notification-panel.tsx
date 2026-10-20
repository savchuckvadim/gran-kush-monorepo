"use client";

import { useTranslations } from "next-intl";

import { Loader2 } from "lucide-react";

import { Button } from "@workspace/ui";

import {
    type Notification,
    type NotificationApp,
    useMarkNotificationsRead,
    useNotificationFeed,
} from "@/modules/entities/notification";

import { NotificationItem } from "./notification-item";
import { NotificationTelegramToggle } from "./notification-telegram-toggle";

interface NotificationPanelProps {
    app: NotificationApp;
    club: string | null;
    unread: number;
    onOpen: (notification: Notification) => void;
}

/** Содержимое колокольчика: «прочитать все», новые сверху, «показать ещё», канал Telegram. */
export function NotificationPanel({ app, club, unread, onOpen }: NotificationPanelProps) {
    const t = useTranslations("common.notifications");
    const feed = useNotificationFeed(app, club, true);
    const markRead = useMarkNotificationsRead(app, club);
    const items = feed.data?.pages.flatMap((page) => page.items) ?? [];

    const open = (notification: Notification) => {
        if (notification.readAt === null) markRead.mutate([notification.id]);
        onOpen(notification);
    };

    return (
        <div className="flex max-h-[min(32rem,75vh)] flex-col gap-2 py-2">
            <div className="flex items-center justify-between gap-2 px-3">
                <h2 className="text-sm font-semibold">{t("title")}</h2>
                {unread > 0 && (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markRead.mutate(undefined)}
                        disabled={markRead.isPending}
                    >
                        {t("readAll")}
                    </Button>
                )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-1">
                {feed.isLoading ? (
                    <div className="flex justify-center py-6">
                        <Loader2
                            className="size-5 animate-spin text-muted-foreground"
                            aria-hidden="true"
                        />
                    </div>
                ) : items.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                        {t("empty")}
                    </p>
                ) : (
                    <ul className="space-y-0.5">
                        {items.map((notification) => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onOpen={open}
                            />
                        ))}
                    </ul>
                )}
                {feed.hasNextPage && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="mt-1 w-full"
                        onClick={() => void feed.fetchNextPage()}
                        disabled={feed.isFetchingNextPage}
                    >
                        {t("loadMore")}
                    </Button>
                )}
            </div>
            <NotificationTelegramToggle app={app} club={club} />
        </div>
    );
}
