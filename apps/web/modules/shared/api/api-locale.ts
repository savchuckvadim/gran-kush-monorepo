import { locales } from "@/modules/shared/config/i18n";

/**
 * Язык интерфейса для `Accept-Language` запросов к API: первый сегмент URL (`/{locale}/...`).
 * В браузере URL — источник истины и на клиентских переходах, и после смены языка.
 * На сервере URL нет: заголовок не ставится, API отвечает на языке по умолчанию.
 */
export function getUiLocaleForApiClient(): string | null {
    if (typeof window === "undefined") {
        return null;
    }
    const segment = window.location.pathname.split("/")[1] ?? "";
    return locales.some((locale) => locale === segment) ? segment : null;
}
