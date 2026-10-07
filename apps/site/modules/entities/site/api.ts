import { getPayloadClient } from "@/modules/shared/api/payload";
import { DEFAULT_LOCALE, type Locale } from "@/modules/shared/config/locales";
import { SITE } from "@/modules/shared/config/site";
import type { Site } from "@/payload-types";

import "server-only";

export const getSiteDoc = async (locale: Locale): Promise<Site | null> => {
    const payload = await getPayloadClient();
    const { docs } = await payload.find({
        collection: "sites",
        where: { code: { equals: SITE } },
        locale,
        fallbackLocale: DEFAULT_LOCALE,
        limit: 1,
    });
    return docs[0] ?? null;
};
