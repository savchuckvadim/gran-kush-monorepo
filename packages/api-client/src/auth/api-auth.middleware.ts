import { Middleware } from "openapi-fetch";

import { ApiRefreshHelper } from "./api-auth.refresh-helper";
import { ApiTokensStorage } from "./api-auth.storage";
import { ApiAuthType } from "./api-auth.type";


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
            if (response.ok) {
                const contentType = response.headers.get("content-type") ?? "";
                if (contentType.includes("application/json")) {
                    const cloned = response.clone();
                    try {
                        const body = (await cloned.json()) as Record<string, unknown>;
                        if (body && typeof body.accessToken === "string") {
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
                let errorMessage = `Request failed: ${response.url} ${response.status} ${response.statusText}`;
                try{
                    const body = (await response.json()) as Record<string, unknown>;
                    if (body && typeof body.message === "string") {
                        
                        errorMessage = body.message;
                        
                    }
                } catch {
                    // ignore parse errors
                    
                }
                
                throw new Error(errorMessage);
            }

            try {
                await refreshHelper.makeToken();
                // @ts-expect-error - _retryRequest is not a property of Request
                const originalRequest: Request = request._retryRequest;
                const retryRequest = new Request(originalRequest.url, {
                    method: originalRequest.method,
                    headers: new Headers(originalRequest.headers),
                    body: originalRequest.body,
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
