import { createNavigation } from "next-intl/navigation";
import { defineRouting } from "next-intl/routing";

import { DEFAULT_LOCALE, LOCALES } from "../config/locales";

export const routing = defineRouting({
    locales: LOCALES,
    defaultLocale: DEFAULT_LOCALE,
    localePrefix: "always",
});

export const { Link, usePathname, useRouter } = createNavigation(routing);
