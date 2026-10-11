export const LOCALES = ["es", "ru", "en"] as const;

export type Locale = (typeof LOCALES)[number];

// Spain first: clubs and their staff read Spanish; Russian and English follow the members.
export const DEFAULT_LOCALE: Locale = "es";

export const LOCALE_LABELS: Record<Locale, string> = {
    es: "ES",
    ru: "RU",
    en: "EN",
};

// og:locale wants language_TERRITORY
export const OG_LOCALES: Record<Locale, string> = {
    es: "es_ES",
    ru: "ru_RU",
    en: "en_US",
};

export const isLocale = (value: string | undefined): value is Locale =>
    (LOCALES as readonly string[]).includes(value ?? "");
