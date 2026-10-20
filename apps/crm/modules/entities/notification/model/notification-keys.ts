import type { NotificationApp } from "../api/notifications.api";

/** У участника уведомления свои в каждом клубе — ключ включает клуб. */
export const notificationKeys = {
    all: ["notifications"] as const,
    of: (app: NotificationApp, club: string | null) => ["notifications", app, club ?? ""] as const,
};
