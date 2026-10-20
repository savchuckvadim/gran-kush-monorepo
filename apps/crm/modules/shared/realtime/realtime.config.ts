/** Без связи активные запросы перечитываются с этим шагом — как прежний опрос. */
export const REALTIME_FALLBACK_POLL_MS = 30_000;

/** Пауза перед повтором, когда сервер не смог принять соединение по своей причине. */
export const REALTIME_RETRY_MS = 5_000;

/** Сколько раз подряд обновлять токен ради соединения, прежде чем считать сессию законченной. */
export const REALTIME_MAX_REFRESH_ATTEMPTS = 3;

/** Предел паузы между автоматическими переподключениями после обрыва сети. */
export const REALTIME_RECONNECT_DELAY_MAX_MS = 10_000;

/** Причины отказа шлюза (`connect_error.message`), см. apps/api realtime.constants. */
export const REALTIME_ERRORS = {
    unauthorized: "unauthorized",
    forbidden: "forbidden",
    originNotAllowed: "origin_not_allowed",
} as const;

/** Сервер закрыл соединение сам: истёк токен, отозвана сессия, изменились права. */
export const SERVER_DISCONNECT_REASON = "io server disconnect";
