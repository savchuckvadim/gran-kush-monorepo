import type { SiteCode } from "../../modules/shared/config/site";

import { PAGES, PLANS, SITE_DOC } from "./content";
import { INKSPACE_CONTENT } from "./content-inkspace";
import type { SiteContent } from "./seed-types";

/** Starter content by installation; one without an entry starts with an empty CMS. */
export const SITE_CONTENT: Partial<Record<SiteCode, SiteContent>> = {
    pafpaf: { PAGES, PLANS, SITE_DOC },
    inkspace: INKSPACE_CONTENT,
};
