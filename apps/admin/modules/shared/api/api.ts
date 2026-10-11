import { ApiAuthType, configureApiClient } from "@workspace/api-client/core";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

/**
 * Админка ходит в API через свой сервер (`app/api/platform/[...path]`): он держит токен
 * платформенного админа в HttpOnly-cookie и подставляет его в `Authorization`.
 */
const ADMIN_PROXY_BASE_URL = "/api";

const client = configureApiClient(ADMIN_PROXY_BASE_URL, ApiAuthType.CRM, {
    authStrategy: "cookie",
});

export const $api: ReturnType<typeof configureApiClient> = client;
export { API_BASE_URL };
