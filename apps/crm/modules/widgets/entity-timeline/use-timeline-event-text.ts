"use client";

import { useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";

import type { TimelineEvent } from "@/modules/entities/timeline";

const PAYMENT_STATUSES = new Set(["paid", "pending", "refunded"]);
const PRODUCT_CHANGES = new Set(["created", "updated", "deleted"]);
const STOCK_REASONS = new Set([
    "order_placed",
    "order_cancelled",
    "manual",
    "purchase",
    "write_off",
    "recount",
    "gift",
]);
const MODULES = new Set(["finance"]);
const LEDGER_SOURCES = new Set(["manual", "order_sale", "import", "reversal", "legacy"]);
const LEDGER_DIRECTIONS = new Set(["income", "expense", "transfer"]);
const LEDGER_BOOKS = new Set(["entries", "purchases", "sales"]);

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
                case "portal.founded":
                case "finance.profile_updated":
                case "finance.tax_rates_changed":
                case "finance.entry_updated":
                case "finance.entry_voided":
                case "finance.categories_changed":
                case "finance.counterparties_changed":
                case "role.changed":
                    return t(name);
                case "finance.entry_recorded": {
                    const source = LEDGER_SOURCES.has(text(data.source))
                        ? text(data.source)
                        : "manual";
                    const direction = LEDGER_DIRECTIONS.has(text(data.direction))
                        ? t(`finance.directions.${text(data.direction)}`)
                        : "";
                    return t(`finance.entry_recorded.${source}`, { direction });
                }
                case "finance.entries_imported":
                    return t("finance.entries_imported", { count: Number(data.count) || 0 });
                case "finance.period_closed":
                case "finance.period_reopened":
                    return t(name, { period: text(data.period) });
                case "finance.accessed":
                    return t("finance.accessed", {
                        book: LEDGER_BOOKS.has(text(data.book))
                            ? t(`finance.books.${text(data.book)}`)
                            : text(data.book),
                    });
                case "portal.module_changed":
                    return t(
                        data.enabled === false ? "portal.module_disabled" : "portal.module_enabled",
                        {
                            module: MODULES.has(text(data.module))
                                ? t(`portal.modules.${text(data.module)}`)
                                : text(data.module),
                        }
                    );
                default:
                    return t("unknown");
            }
        },
        [t, locale]
    );
}
