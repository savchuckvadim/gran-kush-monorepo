export const LOCALES = ["es", "en", "ru", "uk", "ca"] as const;

export type Locale = (typeof LOCALES)[number];

// Spain first: clients read Spanish; English, Russian, Ukrainian and Catalan follow.
export const DEFAULT_LOCALE: Locale = "es";

/** Each language by its own name, as the language menu lists them. */
export const LOCALE_NAMES: Record<Locale, string> = {
    es: "Español",
    en: "English",
    ru: "Русский",
    uk: "Українська",
    ca: "Català",
};

export const LOCALE_LABELS: Record<Locale, string> = {
    es: "ES",
    en: "EN",
    ru: "RU",
    uk: "UA",
    ca: "CA",
};

// og:locale wants language_TERRITORY
export const OG_LOCALES: Record<Locale, string> = {
    es: "es_ES",
    en: "en_US",
    ru: "ru_RU",
    uk: "uk_UA",
    ca: "ca_ES",
};

export const isLocale = (value: string | undefined): value is Locale =>
    (LOCALES as readonly string[]).includes(value ?? "");
