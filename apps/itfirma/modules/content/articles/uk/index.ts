import type { ArticleSlug } from "@/modules/shared/config/articles";

import type { ArticleContent } from "../../types";

import { aiAgentInYourCrm } from "./ai-agent-in-your-crm";
import { bitrix24ForActiveB2bSales } from "./bitrix24-for-active-b2b-sales";
import { customCrmOrOffTheShelf } from "./custom-crm-or-off-the-shelf";

export const UK_ARTICLES: Record<ArticleSlug, ArticleContent> = {
    "bitrix24-for-active-b2b-sales": bitrix24ForActiveB2bSales,
    "custom-crm-or-off-the-shelf": customCrmOrOffTheShelf,
    "ai-agent-in-your-crm": aiAgentInYourCrm,
};
