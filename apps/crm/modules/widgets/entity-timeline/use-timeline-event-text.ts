"use client";

import { useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";

import type { TimelineEvent } from "@/modules/entities/timeline";

const PAYMENT_STATUSES = new Set(["paid", "pending", "refunded"]);
const PRODUCT_CHANGES = new Set(["created", "updated", "deleted"]);
const STOCK_REASONS = new Set(["order_placed", "order_cancelled", "manual"]);

const text = (value: unknown): string =>
    typeof value === "string" || typeof value === "number" ? String(value) : "";

/** Подпись стадии или статуса из `data.labels`: перевод клуба на языке читателя, иначе слово клуба. */
const labelOf = (data: Record<string, unknown>, id: unknown, locale: string): string => {
    const labels = data.labels;
    if (typeof id !== "string" || typeof labels !== "object" || labels === null) return "";
    const entry = Object.entries(labels).find(([key]) => key === id)?.[1];
    if (typeof entry !== "object" || entry === null || !("label" in entry)) return "";
    const translations =
        "labelI18n" in entry && typeof entry.labelI18n === "object" && entry.labelI18n !== null
            ? Object.entries(entry.labelI18n)
            : [];
    return text(translations.find(([key]) => key === locale)?.[1]) || text(entry.label);
};

/** Текст события таймлайна: ключ `crm.timeline.events.*` и поля события. */
export function useTimelineEventText(): (event: TimelineEvent) => string {
    const t = useTranslations("crm.timeline.events");
    const locale = useLocale();

    return useCallback(
        ({ name, data }) => {
            const orderNumber = text(data.orderNumber);
            switch (name) {
                case "order.placed":
                    return t(data.employeeId ? "order.placed" : "order.placedFromCabinet", {
                        orderNumber,
                    });
                case "order.stage_changed":
                    return t("order.stage_changed", {
                        orderNumber,
                        stage: labelOf(data, data.toStageId, locale),
                    });
                case "order.cancelled":
                    return t("order.cancelled", { orderNumber });
                case "order.payment_changed": {
                    const to = text(data.to);
                    return t("order.payment_changed", {
                        orderNumber,
                        payment: PAYMENT_STATUSES.has(to) ? t(`payment.${to}`) : to,
                    });
                }
                case "member.joined":
                case "member.consent_given":
                case "member.updated":
                case "presence.entered":
                case "presence.left":
                case "employee.joined":
                    return t(name);
                case "member.left":
                    return t(data.reason === "declined" ? "member.declined" : "member.left");
                case "member.status_changed":
                    return t("member.status_changed", {
                        status: labelOf(data, data.toStatusItemId, locale),
                    });
                case "employee.access_changed":
                    return t(
                        data.isActive === false
                            ? "employee.access_closed"
                            : "employee.access_changed"
                    );
                case "product.changed":
                    return PRODUCT_CHANGES.has(text(data.change))
                        ? t(`product.${text(data.change)}`)
                        : t("unknown");
                case "product.stock_changed":
                    return STOCK_REASONS.has(text(data.reason))
                        ? t(`product.stock_${text(data.reason)}`)
                        : t("unknown");
                default:
                    return t("unknown");
            }
        },
        [t, locale]
    );
}
