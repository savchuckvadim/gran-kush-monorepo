export const LOCALES = ["es", "en", "ru", "ca"] as const;

export type Locale = (typeof LOCALES)[number];

// Spain first: clients read Spanish; English, Russian and Catalan follow.
export const DEFAULT_LOCALE: Locale = "es";

export const LOCALE_LABELS: Record<Locale, string> = {
    es: "ES",
    en: "EN",
    ru: "RU",
    ca: "CA",
};

// og:locale wants language_TERRITORY
export const OG_LOCALES: Record<Locale, string> = {
    es: "es_ES",
    en: "en_US",
    ru: "ru_RU",
    ca: "ca_ES",
};

export const isLocale = (value: string | undefined): value is Locale =>
    (LOCALES as readonly string[]).includes(value ?? "");
