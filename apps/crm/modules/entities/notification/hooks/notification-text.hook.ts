"use client";

import { useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";

import type { Notification } from "../api/notifications.api";

/** Типы, которые клиент умеет назвать; новее клиента — «новое уведомление». */
const KNOWN_TYPES = new Set([
    "order.placed",
    "order.cancelled_by_member",
    "order.stage_changed",
    "order.cancelled_by_staff",
]);

const text = (value: unknown): string =>
    typeof value === "string" || typeof value === "number" ? String(value) : "";

/** Стадия `{ label, labelI18n }`: перевод клуба на языке читателя, иначе исходное слово. */
const stageLabel = (value: unknown, locale: string): string => {
    if (typeof value !== "object" || value === null || !("label" in value)) return "";
    const translations =
        "labelI18n" in value && typeof value.labelI18n === "object" && value.labelI18n !== null
            ? Object.entries(value.labelI18n)
            : [];
    return text(translations.find(([key]) => key === locale)?.[1]) || text(value.label);
};

/**
 * Текст уведомления на языке интерфейса: тип — ключ `common.notifications.types.*`, параметры
 * — номер заказа, клуб, стадия (её название клуба на языке читателя, если клуб его перевёл).
 */
export function useNotificationText(): (
    notification: Pick<Notification, "type" | "params">
) => string {
    const t = useTranslations("common.notifications.types");
    const locale = useLocale();

    return useCallback(
        ({ type, params }) => {
            if (!KNOWN_TYPES.has(type)) return t("unknown");
            return t(type, {
                orderNumber: text(params.orderNumber),
                club: text(params.club),
                itemCount: text(params.itemCount),
                stage: stageLabel(params.stage, locale),
            });
        },
        [t, locale]
    );
}
