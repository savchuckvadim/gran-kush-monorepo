import type { MetadataRoute } from "next";

import { ARTICLE_SLUGS } from "@/modules/shared/config/articles";
import { LOCALES } from "@/modules/shared/config/locales";
import { LEGAL_DOCS } from "@/modules/shared/config/routes";
import { SERVICE_SLUGS } from "@/modules/shared/config/services";
import { absoluteUrl } from "@/modules/shared/config/site";

interface Entry {
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
}

const ENTRIES: readonly Entry[] = [
    { path: "", changeFrequency: "monthly", priority: 1 },
    ...Object.values(SERVICE_SLUGS).map<Entry>((slug) => ({
        path: `/services/${slug}`,
        changeFrequency: "monthly",
        priority: 0.8,
    })),
    { path: "/insights", changeFrequency: "weekly", priority: 0.6 },
    ...ARTICLE_SLUGS.map<Entry>((slug) => ({
        path: `/insights/${slug}`,
        changeFrequency: "yearly",
        priority: 0.5,
    })),
    ...LEGAL_DOCS.map<Entry>((doc) => ({
        path: `/legal/${doc}`,
        changeFrequency: "yearly",
        priority: 0.2,
    })),
];

export default function sitemap(): MetadataRoute.Sitemap {
    return ENTRIES.map(({ path, changeFrequency, priority }) => ({
        url: absoluteUrl(`/${LOCALES[0]}${path}`),
        changeFrequency,
        priority,
        alternates: {
            languages: Object.fromEntries(
                LOCALES.map((locale) => [locale, absoluteUrl(`/${locale}${path}`)])
            ),
        },
    }));
}
