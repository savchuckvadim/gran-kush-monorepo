import { createNavigation } from "next-intl/navigation";

import { LOCALES } from "../config/locales";

export const { Link, usePathname, useRouter } = createNavigation({ locales: LOCALES });
