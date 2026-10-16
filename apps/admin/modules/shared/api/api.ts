import { ApiAuthType, configureApiClient, type CrmPaths } from "@workspace/api-client/core";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

/**
 * Админка ходит в API через свой сервер (`app/api/platform/[...path]`): он держит токен
 * платформенного админа в HttpOnly-cookie и подставляет его в `Authorization`.
 */
const ADMIN_PROXY_BASE_URL = "/api";

export const $api = configureApiClient<CrmPaths>(ADMIN_PROXY_BASE_URL, ApiAuthType.CRM, {
    authStrategy: "cookie",
});
export { API_BASE_URL };
