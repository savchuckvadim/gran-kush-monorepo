import { ApiAuthType } from "./api-auth.type";

/**
 * Token keys for the bearer strategy only (mobile, scripts). Web clients use HttpOnly cookies and
 * never put tokens into localStorage.
 */
const TOKEN_KEYS: Record<ApiAuthType, { access: string; refresh: string }> = {
    [ApiAuthType.CRM]: { access: "access_token_crm", refresh: "refresh_token_crm" },
    [ApiAuthType.CABINET]: { access: "access_token_cabinet", refresh: "refresh_token_cabinet" },
};

function canUseBrowserStorage(): boolean {
    return typeof window !== "undefined";
}

export class ApiTokensStorage {
    private readonly ACCESS_TOKEN_KEY: string;
    private readonly REFRESH_TOKEN_KEY: string;

    constructor(type: ApiAuthType) {
        this.ACCESS_TOKEN_KEY = TOKEN_KEYS[type].access;
        this.REFRESH_TOKEN_KEY = TOKEN_KEYS[type].refresh;
    }
    public getAccessToken = (): string | null => {
        if (!canUseBrowserStorage()) {
            return null;
        }
        return localStorage.getItem(this.ACCESS_TOKEN_KEY);
    };
    public getRefreshToken = (): string | null => {
        if (!canUseBrowserStorage()) {
            return null;
        }
        return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    };
    public setAccessToken = (accessToken: string) => {
        if (!canUseBrowserStorage()) {
            return;
        }
        localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    };
    public setRefreshToken = (refreshToken: string) => {
        if (!canUseBrowserStorage()) {
            return;
        }
        localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    };
    public clearTokens = () => {
        if (!canUseBrowserStorage()) {
            return;
        }
        localStorage.removeItem(this.ACCESS_TOKEN_KEY);
        localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    };
}
