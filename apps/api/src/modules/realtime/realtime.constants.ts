import type { SessionAudience } from "@modules/portal/auth/sessions/domain/auth-session";

/** Неймспейсы по приложению: сотрудники и участники никогда не делят комнаты. */
export const REALTIME_NAMESPACES: Record<SessionAudience, string> = {
    crm: "/crm",
    cabinet: "/cabinet",
};

/** Единственное сообщение сервера клиенту: конверт доменного события. */
export const REALTIME_EVENT_MESSAGE = "event" as const;

/**
 * Причины отказа в рукопожатии (`connect_error.message`). Клиент на `unauthorized` обновляет
 * токен и подключается снова; на `forbidden` и `origin_not_allowed` — не повторяет.
 */
export const REALTIME_ERRORS = {
    unauthorized: "unauthorized",
    forbidden: "forbidden",
    originNotAllowed: "origin_not_allowed",
} as const;

/** Только WebSocket: long-polling потребовал бы липких сессий на нескольких инстансах API. */
export const REALTIME_TRANSPORTS = ["websocket"] as const;
