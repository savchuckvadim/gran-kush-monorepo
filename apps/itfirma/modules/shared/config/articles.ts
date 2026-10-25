/** Articles under /insights; the slug is the same in every language. */
export const ARTICLE_SLUGS = [
    "bitrix24-for-active-b2b-sales",
    "custom-crm-or-off-the-shelf",
    "ai-agent-in-your-crm",
] as const;

export type ArticleSlug = (typeof ARTICLE_SLUGS)[number];

export const isArticleSlug = (value: string): value is ArticleSlug =>
    (ARTICLE_SLUGS as readonly string[]).includes(value);

export const articlePath = (slug: ArticleSlug) => `/insights/${slug}`;

export const INSIGHTS_PATH = "/insights";
