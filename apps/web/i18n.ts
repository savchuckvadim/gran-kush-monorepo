import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";

export const locales = ["ru", "en", "es"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export default getRequestConfig(async ({ requestLocale }) => {
    // В Next.js 16 с App Router, locale должен приходить из параметров роута [locale]
    // requestLocale может быть Promise или string | undefined
    let locale: string | undefined;

    if (requestLocale instanceof Promise) {
        locale = await requestLocale;
    } else {
        locale = requestLocale;
    }

    // Если locale не передан, используем defaultLocale как fallback
    if (!locale) {
        locale = defaultLocale;
    }

    // Validate that the incoming `locale` parameter is valid
    if (!locale || !locales.includes(locale as Locale)) {
        // Если locale невалиден, используем defaultLocale вместо notFound
        // чтобы избежать 404 при первой загрузке
        locale = defaultLocale;
    }

    // TypeScript doesn't narrow after notFound(), so we assert the type
    // After validation, locale is guaranteed to be a valid Locale string
    const validLocale = locale as Locale;

    try {
        // Load all message files
        // Используем явные пути для каждого locale, чтобы Next.js мог их статически проанализировать
        const [common, auth, navigation, home, contacts, profile, aboutUs] = await Promise.all([
            import(`./modules/shared/config/i18n/messages/${validLocale}/common.json`),
            import(`./modules/shared/config/i18n/messages/${validLocale}/auth.json`),
            import(`./modules/shared/config/i18n/messages/${validLocale}/navigation.json`),
            import(`./modules/shared/config/i18n/messages/${validLocale}/home.json`),
            import(`./modules/shared/config/i18n/messages/${validLocale}/contacts.json`),
            import(`./modules/shared/config/i18n/messages/${validLocale}/profile.json`),
            import(`./modules/shared/config/i18n/messages/${validLocale}/about-us.json`),
        ]);

        return {
            locale: validLocale as string,
            messages: {
                ...common.default,
                ...auth.default,
                ...navigation.default,
                ...home.default,
                ...contacts.default,
                ...profile.default,
                ...aboutUs.default,
            },
        };
    } catch (error) {
        console.error(`Failed to load messages for locale "${validLocale}":`, error);
        notFound();
    }
});
