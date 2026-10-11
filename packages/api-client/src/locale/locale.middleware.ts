import { Middleware } from "openapi-fetch";

/** По нему API выбирает язык подписей системных полей и статусов. */
export const ACCEPT_LANGUAGE_HEADER = "Accept-Language";

/**
 * Проставляет `Accept-Language` текущего языка интерфейса.
 *
 * Без явного заголовка браузер шлёт свой язык, а не выбранный в приложении,
 * и подписи данных расходились бы с интерфейсом. Явно переданный вызывающим
 * кодом заголовок не перетирается; `getLocale` без значения — заголовок не ставится.
 */
export const getLocaleMiddleware = (getLocale: () => string | null | undefined): Middleware => ({
    onRequest: ({ request }) => {
        const locale = getLocale();
        if (!locale || request.headers.has(ACCEPT_LANGUAGE_HEADER)) {
            return;
        }
        request.headers.set(ACCEPT_LANGUAGE_HEADER, locale);
    },
});
