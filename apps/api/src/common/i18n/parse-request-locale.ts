import { ContentLocale, DEFAULT_CONTENT_LOCALE, isContentLocale } from "./content-locale";

/**
 * Язык интерфейса из `Accept-Language`: первичный подтег первого языка
 * (`es-ES,es;q=0.9` → `es`). Клиенты CRM и кабинета шлют ровно один язык —
 * текущий из URL, поэтому q-веса не разбираем.
 */
export const parseRequestLocale = (header: string | string[] | undefined): ContentLocale => {
    const raw = Array.isArray(header) ? header[0] : header;
    const primary = raw?.split(",")[0]?.split(";")[0]?.trim().split("-")[0]?.toLowerCase();
    return isContentLocale(primary) ? primary : DEFAULT_CONTENT_LOCALE;
};
