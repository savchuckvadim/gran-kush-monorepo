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
