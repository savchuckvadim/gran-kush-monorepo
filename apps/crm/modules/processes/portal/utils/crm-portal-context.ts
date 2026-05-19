/**
 * Текущий slug портала для CRM API-клиента: middleware в @workspace/api-client
 * добавляет заголовок `x-portal-slug` на каждый запрос.
 * Обновляется из {@link PortalProvider} при смене сегмента `[portal]` в URL.
 */
let crmPortalSlugForApi: string | null = null;

export function setCrmPortalSlugForApiClient(slug: string | null): void {
    crmPortalSlugForApi = slug?.trim() ? slug.trim().toLowerCase() : null;
}

export function getCrmPortalSlugForApiClient(): string | null {
    return crmPortalSlugForApi;
}
