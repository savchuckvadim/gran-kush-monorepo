import type { MetadataRoute } from "next";

import { listPages } from "@/modules/entities/page/api";
import { DEFAULT_LOCALE, LOCALES } from "@/modules/shared/config/locales";
import { ROUTES } from "@/modules/shared/config/routes";
import { absoluteUrl } from "@/modules/shared/config/site";

// Read from the CMS on request: the Docker build has no database.
export const dynamic = "force-dynamic";

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
    const pages = await listPages();
    return pages.flatMap(({ slug, updatedAt }) => {
        const languages = {
            ...Object.fromEntries(
                LOCALES.map((locale) => [locale, absoluteUrl(ROUTES.page(locale, slug))])
            ),
            "x-default": absoluteUrl(ROUTES.page(DEFAULT_LOCALE, slug)),
        };
        return LOCALES.map((locale) => ({
            url: absoluteUrl(ROUTES.page(locale, slug)),
            lastModified: new Date(updatedAt),
            alternates: { languages },
        }));
    });
};

export default sitemap;
