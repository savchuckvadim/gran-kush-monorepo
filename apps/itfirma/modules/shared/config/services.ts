/** Services the studio sells: keys of the texts (`services.items.<key>`) and of the content pages. */
export const SERVICE_KEYS = [
    "web",
    "apps",
    "mobile",
    "bitrix",
    "integrations",
    "ai",
    "aiAdoption",
    "devops",
] as const;

export type ServiceKey = (typeof SERVICE_KEYS)[number];

/** Address of each service page; the same in every language so links never break on a switch. */
export const SERVICE_SLUGS: Record<ServiceKey, string> = {
    web: "web-development",
    apps: "web-apps-saas",
    mobile: "mobile-apps",
    bitrix: "bitrix24",
    integrations: "integrations",
    ai: "ai-agents",
    aiAdoption: "ai-adoption",
    devops: "devops-support",
};

const KEY_BY_SLUG = new Map(
    (Object.entries(SERVICE_SLUGS) as [ServiceKey, string][]).map(([key, slug]) => [slug, key])
);

export const serviceKeyBySlug = (slug: string): ServiceKey | null => KEY_BY_SLUG.get(slug) ?? null;

export const servicePath = (key: ServiceKey) => `/services/${SERVICE_SLUGS[key]}`;

/** Services the home page spotlights with a bigger tile. */
export const FEATURED_SERVICES: readonly ServiceKey[] = ["bitrix", "apps"];
