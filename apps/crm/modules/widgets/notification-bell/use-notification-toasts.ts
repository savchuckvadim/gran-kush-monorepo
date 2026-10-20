"use client";

import { useTranslations } from "next-intl";

import { toast } from "sonner";

import type { Notification } from "@/modules/entities/notification";
import { useNotificationText } from "@/modules/entities/notification";
import { useRealtimeEvent } from "@/modules/shared/realtime";

/**
 * Тост на новое уведомление: текст тот же, что в колокольчике, «Открыть» ведёт к предмету.
 * Событие приходит только адресату — фильтровать по получателю не нужно.
 */
export function useNotificationToasts(
    onOpen: (notification: Pick<Notification, "subjectKind" | "subjectId">) => void
): void {
    const t = useTranslations("common.notifications");
    const text = useNotificationText();

    useRealtimeEvent(["notification.created"], (event) => {
        if (event.name !== "notification.created") return;
        const { type, params, subjectKind, subjectId } = event.payload;
        toast(text({ type, params }), {
            action: { label: t("open"), onClick: () => onOpen({ subjectKind, subjectId }) },
        });
    });
}
