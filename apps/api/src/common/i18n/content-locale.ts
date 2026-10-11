/** Языки, на которые переведены системные подписи данных (поля, статусы шаблонов). */
export const CONTENT_LOCALES = ["es", "ru", "en"] as const;

export type ContentLocale = (typeof CONTENT_LOCALES)[number];

/** Испания — основной рынок: без заголовка или с неизвестным языком отвечаем по-испански. */
export const DEFAULT_CONTENT_LOCALE: ContentLocale = "es";

/** Форма `labelI18n` в шаблонах: `{ es, ru, en }`. */
export type LabelTranslations = Record<ContentLocale, string>;

export const isContentLocale = (value: unknown): value is ContentLocale =>
    typeof value === "string" && (CONTENT_LOCALES as readonly string[]).includes(value);
