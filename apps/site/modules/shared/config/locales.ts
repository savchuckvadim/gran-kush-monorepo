export const LOCALES = ["es", "ru", "en"] as const;

export type Locale = (typeof LOCALES)[number];

// Spain first: clubs and their staff read Spanish; Russian and English follow the members.
export const DEFAULT_LOCALE: Locale = "es";

export const LOCALE_LABELS: Record<Locale, string> = {
    es: "ES",
    ru: "RU",
    en: "EN",
};

export const isLocale = (value: string | undefined): value is Locale =>
    (LOCALES as readonly string[]).includes(value ?? "");
