import { Middleware } from "openapi-fetch";
import { ApiAuthType } from "./api-auth.type";
import { ApiRefreshHelper } from "./api-auth.refresh-helper";
import { ApiTokensStorage } from "./api-auth.storage";


export const getAuthMiddleware = (type: ApiAuthType, baseUrl: string): Middleware => {

    const refreshHelper = new ApiRefreshHelper(type, baseUrl);
    const storage = new ApiTokensStorage(type);

    const authMiddleware: Middleware = {
        onRequest: async ({ request }) => {
            const accessToken = storage.getAccessToken();
            if (accessToken) {
                request.headers.set("Authorization", `Bearer ${accessToken}`);
            }
            // @ts-expect-error - _retryRequest is not a property of Request
            request._retryRequest = request.clone();
        },
        onResponse: async ({ request, response }) => {
            if (response.ok) return response;
            if (!response.ok && response.status !== 401) {
                throw new Error(`Request failed: ${response.url} ${response.status} ${response.statusText}`);
            }

            try {
                await refreshHelper.makeToken();
                // @ts-expect-error - _retryRequest is not a property of Request
                const originalRequest: Request = request._retryRequest;
                const retryRequest = new Request(originalRequest.url, {
                    headers: new Headers(originalRequest.headers),

                });
                const accessToken = storage.getAccessToken();
                retryRequest.headers.set("Authorization", `Bearer ${accessToken}`);
                return fetch(retryRequest);
            } catch {
                console.log(`Failed to refresh access token: catch`);
                return response;
            }

        },
    };
    return authMiddleware
};
