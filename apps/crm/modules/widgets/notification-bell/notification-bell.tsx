"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Bell } from "lucide-react";

import { Button, Popover, PopoverContent, PopoverTrigger } from "@workspace/ui";

import {
    type Notification,
    type NotificationApp,
    useUnreadNotifications,
} from "@/modules/entities/notification";

import { NotificationPanel } from "./notification-panel";
import { useNotificationToasts } from "./use-notification-toasts";

/** Больше — «9+»: точное число в значке не нужно. */
const BADGE_MAX = 9;

type Subject = Pick<Notification, "subjectKind" | "subjectId">;

interface NotificationBellProps {
    app: NotificationApp;
    /** Клуб кабинета; у CRM клуб задаёт сам клиент API */
    club: string | null;
    /** Открыть предмет уведомления: в CRM — слайдер, в кабинете — страница */
    onOpen: (subject: Subject) => void;
}

/**
 * Колокольчик в шапке (TASK-781): значок непрочитанных, список по нажатию и тост на новое
 * уведомление. Одинаков для сотрудника и участника — отличается только `app` и переход.
 */
export function NotificationBell({ app, club, onOpen }: NotificationBellProps) {
    const t = useTranslations("common.notifications");
    const [open, setOpen] = useState(false);
    const unread = useUnreadNotifications(app, club).data ?? 0;
    useNotificationToasts(onOpen);

    const openSubject = (subject: Subject) => {
        setOpen(false);
        onOpen(subject);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative rounded-full"
                    aria-label={unread > 0 ? t("bellUnread", { count: unread }) : t("bell")}
                    title={t("bell")}
                >
                    <Bell aria-hidden="true" />
                    {unread > 0 && (
                        <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-semibold text-white">
                            {unread > BADGE_MAX ? `${BADGE_MAX}+` : unread}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
                <NotificationPanel app={app} club={club} unread={unread} onOpen={openSubject} />
            </PopoverContent>
        </Popover>
    );
}
