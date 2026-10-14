import { Middleware } from "openapi-fetch";

import type { ApiAuthStrategy } from "../client/client";
import { parseApiErrorFromResponse } from "../errors/api-error";

import { getOrCreateDeviceId } from "./api-auth.device-id";
import { ApiRefreshHelper } from "./api-auth.refresh-helper";
import { ApiTokensStorage } from "./api-auth.storage";
import { ApiAuthType } from "./api-auth.type";

/** 401 с этих маршрутов — ответ по существу (неверный пароль, протухший refresh), не повод рефрешить. */
const isAuthEndpoint = (url: string): boolean =>
    /\/auth\/(login|refresh|logout)(\?|$)/.test(url) || url.includes("/public/");

export const getAuthMiddleware = (
    type: ApiAuthType,
    baseUrl: string,
    authStrategy: ApiAuthStrategy = "token",
    getPortalSlug?: () => string | null
): Middleware => {
    const refreshHelper = new ApiRefreshHelper(type, baseUrl, authStrategy);
    const storage = new ApiTokensStorage(type);

    const authMiddleware: Middleware = {
        onRequest: async ({ request }) => {
            const slug = getPortalSlug?.();
            if (slug) {
                request.headers.set("X-Portal-Slug", slug);
            }
            const deviceId = getOrCreateDeviceId();
            if (deviceId) {
                request.headers.set("X-Device-Id", deviceId);
            }

            if (authStrategy === "cookie") {
                // Do not set `request.credentials` — it is read-only on Request; cookie clients pass
                // `credentials: "include"` in configureApiClient’s fetch wrapper instead.
                // @ts-expect-error - _retryRequest is not a property of Request
                request._retryRequest = request.clone();
                return;
            } else {
                const accessToken = storage.getAccessToken();
                if (accessToken) {
                    request.headers.set("Authorization", `Bearer ${accessToken}`);
                }
                // @ts-expect-error - _retryRequest is not a property of Request
                request._retryRequest = request.clone();
                return;
            }
        },
        onResponse: async ({ request, response }) => {
            if (response.ok) {
                const contentType = response.headers.get("content-type") ?? "";
                if (contentType.includes("application/json")) {
                    const cloned = response.clone();
                    try {
                        const body = (await cloned.json()) as Record<string, unknown>;
                        if (
                            authStrategy === "token" &&
                            body &&
                            typeof body.accessToken === "string"
                        ) {
                            storage.setAccessToken(body.accessToken);
                            if (typeof body.refreshToken === "string") {
                                storage.setRefreshToken(body.refreshToken);
                            }
                        }
                    } catch {
                        // ignore parse errors
                    }
                }
                return response;
            }
            if (!response.ok && response.status !== 401) {
                // ApiClientError сохраняет status/body — консюмеры различают 402/403/404
                throw await parseApiErrorFromResponse(response);
            }

            if (isAuthEndpoint(request.url)) {
                return response;
            }

            try {
                await refreshHelper.makeToken();
                // Ретраим сохранённый клон: его тело не прочитано. Сборка нового Request
                // из body-стрима падала TypeError (нет duplex) — POST после refresh
                // возвращал исходный 401, хотя refresh прошёл.
                // @ts-expect-error - _retryRequest is not a property of Request
                const retryRequest: Request = request._retryRequest;
                const retried =
                    authStrategy === "cookie"
                        ? await fetch(retryRequest, { credentials: "include" })
                        : await (async () => {
                              retryRequest.headers.set(
                                  "Authorization",
                                  `Bearer ${storage.getAccessToken()}`
                              );
                              return fetch(retryRequest);
                          })();
                // Тот же контракт, что и у первого ответа: не-401 ошибки — ApiClientError
                if (retried.ok || retried.status === 401) {
                    return retried;
                }
                throw await parseApiErrorFromResponse(retried);
            } catch (error) {
                if (error && typeof error === "object" && "status" in error) {
                    throw error;
                }
                // Refresh не прошёл (нет refresh-токена и т.п.): отдаём исходный 401
                if (authStrategy === "token") {
                    storage.clearTokens();
                }
                return response;
            }
        },
    };
    return authMiddleware;
};
