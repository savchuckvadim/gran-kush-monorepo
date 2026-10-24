import type { MetadataRoute } from "next";

import { LOCALES } from "@/modules/shared/config/locales";
import { LEGAL_DOCS } from "@/modules/shared/config/routes";
import { absoluteUrl } from "@/modules/shared/config/site";

const PATHS = ["", ...LEGAL_DOCS.map((doc) => `/legal/${doc}`)];

export default function sitemap(): MetadataRoute.Sitemap {
    return PATHS.map((path) => ({
        url: absoluteUrl(`/${LOCALES[0]}${path}`),
        changeFrequency: path ? "yearly" : "monthly",
        priority: path ? 0.2 : 1,
        alternates: {
            languages: Object.fromEntries(
                LOCALES.map((locale) => [locale, absoluteUrl(`/${locale}${path}`)])
            ),
        },
    }));
}
