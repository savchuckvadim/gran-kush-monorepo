import { Middleware } from "openapi-fetch";

/** Заголовок, который читает IdempotencyInterceptor на стороне API. */
export const IDEMPOTENCY_HEADER = "Idempotency-Key";

/** Методы, повтор которых может создать вторую сущность. */
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH"]);

/**
 * Новый ключ идемпотентности.
 *
 * Вызывающий код может сгенерировать ключ сам и держать его в состоянии формы —
 * тогда защищённым станет и повторный клик пользователя, а не только сетевой ретрай.
 */
export const newIdempotencyKey = (): string => {
    const cryptoApi = globalThis.crypto as Crypto | undefined;
    if (cryptoApi?.randomUUID) {
        return cryptoApi.randomUUID();
    }
    if (cryptoApi?.getRandomValues) {
        const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
        return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    }
    // Небезопасный контекст без Web Crypto: ключ всё равно должен быть уникальным,
    // криптостойкость здесь не требуется — он не секрет.
    return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
};

/**
 * Проставляет `Idempotency-Key` на мутирующие запросы.
 *
 * Регистрируется до auth-middleware: тот клонирует запрос для ретрая после 401 уже
 * с заголовком, поэтому повтор идёт под тем же ключом и не создаёт вторую сущность.
 * Явно переданный вызывающим кодом заголовок не перетирается.
 */
export const getIdempotencyMiddleware = (): Middleware => ({
    onRequest: ({ request }) => {
        if (!MUTATING_METHODS.has(request.method.toUpperCase())) {
            return;
        }
        if (request.headers.has(IDEMPOTENCY_HEADER)) {
            return;
        }
        request.headers.set(IDEMPOTENCY_HEADER, newIdempotencyKey());
    },
});
