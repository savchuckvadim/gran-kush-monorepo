import type { ApiAuthStrategy } from "../client/client";

import { ApiTokensStorage } from "./api-auth.storage";
import { ApiAuthType } from "./api-auth.type";

let refreshPromise: Promise<void> | null = null;

export class ApiRefreshHelper {
    private readonly storage: ApiTokensStorage;
    private readonly baseurl: string;
    private readonly refreshUrl: string;
    private readonly authStrategy: ApiAuthStrategy;
    constructor(type: ApiAuthType, baseurl: string, authStrategy: ApiAuthStrategy = "token") {
        this.baseurl = baseurl;
        this.storage = new ApiTokensStorage(type);
        this.refreshUrl = type === ApiAuthType.CRM ? "/crm/auth/refresh" : "/lk/auth/refresh";
        this.authStrategy = authStrategy;
    }

    public async makeToken(): Promise<void> {
        // Important: callers rely on this method to *finish* refreshing tokens (or throw),
        // so we must return/await the shared `refreshPromise`.
        if (!refreshPromise) {
            refreshPromise = (async () => {
                const response =
                    this.authStrategy === "cookie"
                        ? await fetch(`${this.baseurl}${this.refreshUrl}`, {
                              method: "POST",
                              credentials: "include",
                          })
                        : await this.refreshWithToken();
                if (!response.ok) {
                    if (this.authStrategy === "token") {
                        this.storage.clearTokens();
                    }
                    throw new Error("Failed to refresh access token");
                }
                if (this.authStrategy === "token") {
                    const { accessToken, refreshToken } = (await response.json()) as {
                        accessToken: string;
                        refreshToken: string;
                    };
                    if (!accessToken) {
                        throw new Error("Failed to refresh access token");
                    }
                    this.storage.setAccessToken(accessToken);
                    this.storage.setRefreshToken(refreshToken);
                }
            })();

            refreshPromise.finally(() => {
                refreshPromise = null;
            });
        }

        await refreshPromise;
    }

    private async refreshWithToken(): Promise<Response> {
        const token = await this.refreshAccessToken();
        if (!token) {
            throw new Error("Failed to refresh access token");
        }
        return fetch(`${this.baseurl}${this.refreshUrl}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ refreshToken: token }),
        });
    }

    private async refreshAccessToken(): Promise<string | null> {
        if (this.authStrategy === "cookie") {
            return null;
        }
        if (!this.canUseBrowserStorage()) {
            return null;
        }
        const refreshToken = this.storage.getRefreshToken();
        if (!refreshToken) {
            throw new Error("Refresh token not found");
        }
        return refreshToken;
    }
    private canUseBrowserStorage(): boolean {
        return typeof window !== "undefined";
    }
}
