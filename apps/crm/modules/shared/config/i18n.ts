/**
 * i18n configuration
 * Using next-intl for internationalization
 */

export const locales = ["ru", "en", "es"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
    ru: "Русский",
    en: "English",
    es: "Español",
};
