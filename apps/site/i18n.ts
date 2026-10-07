import { getRequestConfig } from "next-intl/server";

import { DEFAULT_LOCALE, isLocale } from "./modules/shared/config/locales";

export default getRequestConfig(async ({ requestLocale }) => {
    const requested = await requestLocale;
    const locale = isLocale(requested) ? requested : DEFAULT_LOCALE;
    const messages = (await import(`./modules/shared/config/i18n/messages/${locale}.json`)).default;

    return { locale, messages };
});
