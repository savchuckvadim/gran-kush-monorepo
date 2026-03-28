import { ApiAuthType } from "./api-auth.type";

const ACCESS_TOKEN_KEY_CRM = "access_token_crm";
const REFRESH_TOKEN_KEY_CRM = "refresh_token_crm";
const ACCESS_TOKEN_KEY_SITE = "access_token_site";
const REFRESH_TOKEN_KEY_SITE = "refresh_token_site";

function canUseBrowserStorage(): boolean {
    return typeof window !== "undefined";
}

export class ApiTokensStorage {
    private readonly ACCESS_TOKEN_KEY: string = ACCESS_TOKEN_KEY_CRM;
    private readonly REFRESH_TOKEN_KEY: string = REFRESH_TOKEN_KEY_CRM;

    constructor(type: ApiAuthType) {
        this.ACCESS_TOKEN_KEY =
            type === ApiAuthType.CRM ? ACCESS_TOKEN_KEY_CRM : ACCESS_TOKEN_KEY_SITE;
        this.REFRESH_TOKEN_KEY =
            type === ApiAuthType.CRM ? REFRESH_TOKEN_KEY_CRM : REFRESH_TOKEN_KEY_SITE;
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
