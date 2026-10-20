"use client";

import { useLocale } from "next-intl";

import { cn } from "@workspace/ui/lib/utils";

import { type Notification, useNotificationText } from "@/modules/entities/notification";

import { relativeTime } from "./relative-time";

/** Строка уведомления: текст, давность и точка «не прочитано»; нажатие ведёт к предмету. */
export function NotificationItem({
    notification,
    onOpen,
}: {
    notification: Notification;
    onOpen: (notification: Notification) => void;
}) {
    const locale = useLocale();
    const text = useNotificationText();
    const unread = notification.readAt === null;

    return (
        <li>
            <button
                type="button"
                onClick={() => onOpen(notification)}
                className={cn(
                    "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent",
                    unread && "bg-primary/5"
                )}
            >
                <span
                    aria-hidden="true"
                    className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        unread ? "bg-primary" : "bg-transparent"
                    )}
                />
                <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm", unread && "font-medium")}>
                        {text(notification)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                        {relativeTime(notification.createdAt, locale)}
                    </span>
                </span>
            </button>
        </li>
    );
}
