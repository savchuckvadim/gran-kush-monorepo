import { ApiTokensStorage } from "./api-auth.storage";
import { ApiAuthType } from "./api-auth.type";

let refreshPromise: Promise<void> | null = null;


export class ApiRefreshHelper {
    private readonly storage: ApiTokensStorage;
    private readonly baseurl: string;
    private readonly refreshUrl: string;
    private readonly type: ApiAuthType;
    constructor(type: ApiAuthType, baseurl: string) {
        this.baseurl = baseurl;
        this.storage = new ApiTokensStorage(type);
        this.refreshUrl = type === ApiAuthType.CRM ? "/crm/auth/refresh" : "/site/auth/refresh";
        this.type = type;
    }


    public async makeToken() {
        if (!refreshPromise) {
            refreshPromise = (async () => {
                const token = await this.refreshAccessToken();
                if (!token) {
                    throw new Error("Failed to refresh access token");
                }
                const response = await fetch(`${this.baseurl}${this.refreshUrl}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ refreshToken: token }),
                });
                if (!response.ok) {
                    this.storage.clearTokens();
                    throw new Error("Failed to refresh access token");
                }
                const { accessToken, refreshToken } = await response.json() as { accessToken: string, refreshToken: string };
                if (!accessToken) {
                    throw new Error("Failed to refresh access token");
                }
                this.storage.setAccessToken(accessToken);
                this.storage.setRefreshToken(refreshToken);


            })();
            refreshPromise.finally(() => {
                refreshPromise = null;
            });
        }

    };

    private async refreshAccessToken(): Promise<string | null> {
        if (!this.canUseBrowserStorage()) {
            return null;
        }
        const refreshToken = this.storage.getRefreshToken();
        if (!refreshToken) {
            throw new Error("Refresh token not found");
        }
        return refreshToken;

    };
    private canUseBrowserStorage(): boolean {
        return typeof window !== "undefined";
    }

}





