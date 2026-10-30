import { ApiAuthType, configureApiClient, type CrmPaths } from "@workspace/api-client/core";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

/**
 * Админка ходит в API через свой сервер (`app/api/platform/[...path]`): он держит токен
 * платформенного админа в HttpOnly-cookie, подставляет его в `Authorization` и сам обновляет пару
 * на 401. Браузерный refresh выключен: у прокси нет `/crm/auth/refresh`, а 401 после его попытки
 * означает конец сессии (`useSessionExpiredRedirect`).
 */
const ADMIN_PROXY_BASE_URL = "/api";

export const $api = configureApiClient<CrmPaths>(ADMIN_PROXY_BASE_URL, ApiAuthType.CRM, {
    refresh: false,
});
export { API_BASE_URL };
