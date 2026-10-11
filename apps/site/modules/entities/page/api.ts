import { getPayloadClient } from "@/modules/shared/api/payload";
import { DEFAULT_LOCALE, type Locale } from "@/modules/shared/config/locales";
import { SITE } from "@/modules/shared/config/site";
import type { Page } from "@/payload-types";

import "server-only";

export const getPage = async (slug: string, locale: Locale): Promise<Page | null> => {
    const payload = await getPayloadClient();
    const { docs } = await payload.find({
        collection: "pages",
        where: { and: [{ site: { equals: SITE } }, { slug: { equals: slug } }] },
        locale,
        fallbackLocale: DEFAULT_LOCALE,
        limit: 1,
        depth: 1,
    });
    return docs[0] ?? null;
};

export interface PageEntry {
    slug: string;
    updatedAt: string;
}

// Pages have no drafts: every document of this site is live in all locales.
export const listPages = async (): Promise<PageEntry[]> => {
    const payload = await getPayloadClient();
    const { docs } = await payload.find({
        collection: "pages",
        where: { site: { equals: SITE } },
        select: { slug: true, updatedAt: true },
        sort: "createdAt",
        depth: 0,
        pagination: false,
    });
    return docs.map(({ slug, updatedAt }) => ({ slug, updatedAt }));
};
