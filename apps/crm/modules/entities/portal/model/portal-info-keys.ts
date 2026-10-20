/** Ключи сведений о клубе отдельно от хуков: их читают правила realtime при старте приложения. */
export const portalInfoKeys = {
    all: ["crm-portal-info"] as const,
    detail: (portalSlug: string | null) => [...portalInfoKeys.all, portalSlug] as const,
} as const;
