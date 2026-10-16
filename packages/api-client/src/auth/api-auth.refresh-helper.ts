import type { ApiAuthStrategy } from "../client/client";

import { ApiTokensStorage } from "./api-auth.storage";
import { ApiAuthType, REFRESH_PATH } from "./api-auth.type";

/**
 * Обновление токенов идёт по одному запросу на тип клиента. Общий для всех клиентов промис не
 * годится: кабинет участника и CRM живут в одном приложении, и 401 у одного ждал бы refresh другого
 * (а то и получал его результат вместо своего).
 */
const refreshPromises = new Map<ApiAuthType, Promise<void>>();

export class ApiRefreshHelper {
    private readonly type: ApiAuthType;
    private readonly storage: ApiTokensStorage;
    private readonly baseurl: string;
    private readonly refreshUrl: string;
    private readonly authStrategy: ApiAuthStrategy;
    constructor(type: ApiAuthType, baseurl: string, authStrategy: ApiAuthStrategy = "token") {
        this.type = type;
        this.baseurl = baseurl;
        this.storage = new ApiTokensStorage(type);
        this.refreshUrl = REFRESH_PATH[type];
        this.authStrategy = authStrategy;
    }

    public async makeToken(): Promise<void> {
        // Important: callers rely on this method to *finish* refreshing tokens (or throw),
        // so we must return/await the shared `refreshPromise`.
        let refreshPromise = refreshPromises.get(this.type);
        if (!refreshPromise) {
            // finally в той же цепочке: отдельный `refreshPromise.finally()` никто не ловил,
            // и неудачный refresh всплывал в консоли необработанным reject
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
            })().finally(() => {
                refreshPromises.delete(this.type);
            });
            refreshPromises.set(this.type, refreshPromise);
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
