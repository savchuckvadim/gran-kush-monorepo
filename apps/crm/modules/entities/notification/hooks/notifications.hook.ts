"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { type NotificationApp, NOTIFICATIONS_API } from "../api/notifications.api";
import { notificationKeys } from "../model/notification-keys";

/** Уведомления адресата: новые сверху, курсором; `enabled` — когда открыт колокольчик. */
export function useNotificationFeed(app: NotificationApp, club: string | null, enabled: boolean) {
    return useInfiniteQuery({
        queryKey: [...notificationKeys.of(app, club), "feed"],
        queryFn: ({ pageParam }) => NOTIFICATIONS_API[app].list(pageParam),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (last) => last.nextCursor ?? undefined,
        enabled,
    });
}

/** Значок колокольчика; новые уведомления перечитывает realtime (`notification.created`). */
export function useUnreadNotifications(app: NotificationApp, club: string | null) {
    return useQuery({
        queryKey: [...notificationKeys.of(app, club), "unread"],
        queryFn: () => NOTIFICATIONS_API[app].unread(),
    });
}

export function useMarkNotificationsRead(app: NotificationApp, club: string | null) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (ids: string[] | undefined) => NOTIFICATIONS_API[app].read(ids),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: notificationKeys.of(app, club) }),
    });
}

export function useNotificationPreferences(
    app: NotificationApp,
    club: string | null,
    enabled: boolean
) {
    return useQuery({
        queryKey: [...notificationKeys.of(app, club), "preferences"],
        queryFn: () => NOTIFICATIONS_API[app].preferences(),
        enabled,
    });
}

export function useSetTelegramNotifications(app: NotificationApp, club: string | null) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (telegram: boolean) => NOTIFICATIONS_API[app].setTelegram(telegram),
        onSuccess: (saved) =>
            queryClient.setQueryData([...notificationKeys.of(app, club), "preferences"], saved),
    });
}
