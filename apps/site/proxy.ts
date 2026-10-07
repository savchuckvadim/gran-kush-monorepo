import createMiddleware from "next-intl/middleware";

import { DEFAULT_LOCALE, LOCALES } from "./modules/shared/config/locales";

export default createMiddleware({
    locales: LOCALES,
    defaultLocale: DEFAULT_LOCALE,
    localePrefix: "always",
});

export const config = {
    // The Payload admin and REST API live outside the localized site.
    matcher: ["/((?!api|admin|_next|_vercel|.*\\..*).*)"],
};
