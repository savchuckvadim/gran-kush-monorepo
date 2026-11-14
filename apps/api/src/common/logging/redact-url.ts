/**
 * Секреты в URL, которые не должны попадать в лог.
 *
 * Одноразовые ссылки (приглашение, согласие, регистрация по ссылке клуба) несут токен первым
 * сегментом после префикса: кто прочитал лог, тот может принять приглашение или подтвердить
 * членство за владельца ссылки. OAuth-колбэк несёт `code` и `state` в query.
 */

export const REDACTED = "[redacted]";

/** Префиксы маршрутов, у которых следующий сегмент — токен (контроллеры invitations, consent, reg-links). */
export const TOKEN_PATH_PREFIXES = [
    "public/invitations",
    "crm/auth/invitations",
    "cabinet/invitations",
    "public/consent",
    "public/reg-links",
    "cabinet/reg-links",
] as const;

/** Имена query-параметров, значения которых — секреты (токены ссылок, OAuth `code`/`state`). */
const SECRET_QUERY_KEY = /token|code|state|secret|password/i;

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const TOKEN_SEGMENT = new RegExp(
    `(/(?:${TOKEN_PATH_PREFIXES.map(escapeRegExp).join("|")})/)[^/?#]+`,
    "g"
);

const decodeURIComponentSafe = (value: string): string => {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
};

const redactQuery = (query: string): string =>
    query
        .split("&")
        .map((pair) => {
            const separator = pair.indexOf("=");
            if (separator < 0) {
                return pair;
            }
            const key = pair.slice(0, separator);
            return SECRET_QUERY_KEY.test(decodeURIComponentSafe(key)) ? `${key}=${REDACTED}` : pair;
        })
        .join("&");

/** URL запроса для лога: токен из пути и секретные значения query заменены на `[redacted]`. */
export const redactUrl = (url: string): string => {
    const queryStart = url.indexOf("?");
    const path = queryStart < 0 ? url : url.slice(0, queryStart);
    const redactedPath = path.replace(TOKEN_SEGMENT, `$1${REDACTED}`);
    if (queryStart < 0) {
        return redactedPath;
    }
    return `${redactedPath}?${redactQuery(url.slice(queryStart + 1))}`;
};
