import { getRouteContext } from "@/modules/processes/auth/utils/auth-routing";

/**
 * Текущий slug портала для CRM API-клиента: middleware в @workspace/api-client
 * добавляет заголовок `x-portal-slug` на каждый запрос.
 *
 * В браузере источник истины — URL. Провайдеры порталов вложены (`[locale]/layout`
 * рендерит PortalProvider с null, `[portal]/layout` — со слагом), а эффекты в React
 * выполняются снизу вверх, поэтому внешний провайдер затирал значение внутреннего
 * и заголовок уходил пустым. Значение из {@link setCrmPortalSlugForApiClient}
 * остаётся фолбэком вне браузера.
 */
let crmPortalSlugForApi: string | null = null;

function normalizeSlug(slug: string | null | undefined): string | null {
    return slug?.trim() ? slug.trim().toLowerCase() : null;
}

export function setCrmPortalSlugForApiClient(slug: string | null): void {
    crmPortalSlugForApi = normalizeSlug(slug);
}

export function getCrmPortalSlugForApiClient(): string | null {
    if (typeof window === "undefined") {
        return crmPortalSlugForApi;
    }

    return normalizeSlug(getRouteContext(window.location.pathname).portalSlug);
}
