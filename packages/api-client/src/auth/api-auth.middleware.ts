import { Middleware } from "openapi-fetch";

import { parseApiErrorFromResponse } from "../errors/api-error";

import { getOrCreateDeviceId } from "./api-auth.device-id";
import { ApiRefreshHelper } from "./api-auth.refresh-helper";
import { ApiAuthType } from "./api-auth.type";

/** 401 с этих маршрутов — ответ по существу (неверный пароль, конченая сессия), не повод рефрешить. */
const isAuthEndpoint = (url: string): boolean =>
    /\/auth\/(login|refresh|logout)(\?|$)/.test(url) || url.includes("/public/");

/** Клон запроса до отправки: его тело не прочитано, и после refresh его можно повторить. */
const retryRequests = new WeakMap<Request, Request>();

export type AuthMiddlewareOptions = {
    getPortalSlug?: () => string | null;
    /** `false` — 401 отдаётся как есть: сессию обновляет не браузер, а сервер приложения. */
    refresh?: boolean;
};

/**
 * Сессия по HttpOnly-кукам: заголовки клуба и устройства на запрос; на 401 — один refresh на тип
 * клиента и повтор исходного запроса. Не-401 ошибки становятся `ApiClientError` со статусом и телом.
 */
export const getAuthMiddleware = (
    type: ApiAuthType,
    baseUrl: string,
    options: AuthMiddlewareOptions = {}
): Middleware => {
    const { getPortalSlug, refresh = true } = options;
    const refreshHelper = new ApiRefreshHelper(type, baseUrl);

    return {
        onRequest: ({ request }) => {
            const slug = getPortalSlug?.();
            if (slug) {
                request.headers.set("X-Portal-Slug", slug);
            }
            const deviceId = getOrCreateDeviceId();
            if (deviceId) {
                request.headers.set("X-Device-Id", deviceId);
            }
            // `credentials` у Request только для чтения: куки включает fetch-обёртка клиента
            retryRequests.set(request, request.clone());
            return request;
        },
        onResponse: async ({ request, response }) => {
            if (response.ok) {
                return response;
            }
            if (response.status !== 401) {
                // ApiClientError сохраняет status/body — консюмеры различают 402/403/404
                throw await parseApiErrorFromResponse(response);
            }
            if (!refresh || isAuthEndpoint(request.url)) {
                return response;
            }

            try {
                await refreshHelper.makeToken();
            } catch {
                // Refresh не прошёл (сессии нет): отдаём исходный 401
                return response;
            }
            // Ретраим сохранённый клон: сборка нового Request из прочитанного body-стрима падала
            // TypeError (нет duplex) — POST после refresh возвращал исходный 401
            const retried = await fetch(retryRequests.get(request) ?? request, {
                credentials: "include",
            });
            // Тот же контракт, что и у первого ответа: не-401 ошибки — ApiClientError
            if (retried.ok || retried.status === 401) {
                return retried;
            }
            throw await parseApiErrorFromResponse(retried);
        },
    };
};
