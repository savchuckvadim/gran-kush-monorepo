import createMiddleware from "next-intl/middleware";

import { DEFAULT_LOCALE, LOCALES } from "./modules/shared/config/locales";

export default createMiddleware({
    locales: LOCALES,
    defaultLocale: DEFAULT_LOCALE,
    localePrefix: "always",
});

export const config = {
    // The lead endpoint and the generated icon routes live outside the localized site.
    matcher: ["/((?!api|_next|_vercel|icon|apple-icon|.*\\..*).*)"],
};
