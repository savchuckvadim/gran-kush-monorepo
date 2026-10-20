import { CONTENT_LOCALES, type ContentLocale, resolveLabel } from "@common/i18n";

import {
    NOTIFICATION_TYPES,
    type NotificationLabel,
    type NotificationParams,
    type NotificationType,
} from "./notification";

/** Язык Telegram (`ru`, `en-GB`…) → наш язык; незнакомый — язык клубов по умолчанию. */
export const TELEGRAM_FALLBACK_LOCALE: ContentLocale = "es";

export const telegramLocale = (code: string | null): ContentLocale => {
    const short = code?.slice(0, 2).toLowerCase();
    return CONTENT_LOCALES.find((locale) => locale === short) ?? TELEGRAM_FALLBACK_LOCALE;
};

const text = (params: NotificationParams, key: string): string => {
    const value = params[key];
    return typeof value === "string" || typeof value === "number" ? String(value) : "";
};

const isLabel = (value: unknown): value is NotificationLabel =>
    typeof value === "object" && value !== null && "label" in value;

const stage = (params: NotificationParams, locale: ContentLocale): string => {
    const value = params.stage;
    return isLabel(value) ? resolveLabel(value, locale) : "";
};

type Render = (params: NotificationParams, locale: ContentLocale) => string;

/**
 * Тексты уведомлений вне приложения (Telegram). В приложении тот же `type` переводит клиент
 * (`notifications.types.*`), поэтому смысл строк здесь и там один.
 */
const TEXTS: Record<ContentLocale, Record<NotificationType, Render> & { open: string }> = {
    ru: {
        [NOTIFICATION_TYPES.orderPlaced]: (p) =>
            `🛒 ${text(p, "club")}: новый заказ ${text(p, "orderNumber")} из кабинета, позиций — ${text(p, "itemCount")}`,
        [NOTIFICATION_TYPES.orderCancelledByMember]: (p) =>
            `↩️ ${text(p, "club")}: участник отменил заказ ${text(p, "orderNumber")}`,
        [NOTIFICATION_TYPES.orderStageChanged]: (p, l) =>
            `📦 ${text(p, "club")}: заказ ${text(p, "orderNumber")} — ${stage(p, l)}`,
        [NOTIFICATION_TYPES.orderCancelledByStaff]: (p) =>
            `✖️ ${text(p, "club")}: заказ ${text(p, "orderNumber")} отменён`,
        open: "Открыть",
    },
    en: {
        [NOTIFICATION_TYPES.orderPlaced]: (p) =>
            `🛒 ${text(p, "club")}: new order ${text(p, "orderNumber")} from the cabinet, items: ${text(p, "itemCount")}`,
        [NOTIFICATION_TYPES.orderCancelledByMember]: (p) =>
            `↩️ ${text(p, "club")}: a member cancelled order ${text(p, "orderNumber")}`,
        [NOTIFICATION_TYPES.orderStageChanged]: (p, l) =>
            `📦 ${text(p, "club")}: order ${text(p, "orderNumber")} — ${stage(p, l)}`,
        [NOTIFICATION_TYPES.orderCancelledByStaff]: (p) =>
            `✖️ ${text(p, "club")}: order ${text(p, "orderNumber")} was cancelled`,
        open: "Open",
    },
    es: {
        [NOTIFICATION_TYPES.orderPlaced]: (p) =>
            `🛒 ${text(p, "club")}: nuevo pedido ${text(p, "orderNumber")} desde el área de socios, productos: ${text(p, "itemCount")}`,
        [NOTIFICATION_TYPES.orderCancelledByMember]: (p) =>
            `↩️ ${text(p, "club")}: un socio canceló el pedido ${text(p, "orderNumber")}`,
        [NOTIFICATION_TYPES.orderStageChanged]: (p, l) =>
            `📦 ${text(p, "club")}: pedido ${text(p, "orderNumber")} — ${stage(p, l)}`,
        [NOTIFICATION_TYPES.orderCancelledByStaff]: (p) =>
            `✖️ ${text(p, "club")}: el pedido ${text(p, "orderNumber")} se ha cancelado`,
        open: "Abrir",
    },
};

const isNotificationType = (type: string): type is NotificationType =>
    (Object.values(NOTIFICATION_TYPES) as string[]).includes(type);

/** Текст уведомления на языке получателя; незнакомый тип (новее сервера) — `null`. */
export const renderNotification = (
    type: string,
    params: NotificationParams,
    locale: ContentLocale
): string | null => (isNotificationType(type) ? TEXTS[locale][type](params, locale) : null);

export const openLabel = (locale: ContentLocale): string => TEXTS[locale].open;
