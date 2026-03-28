import { Injectable } from "@nestjs/common";

import { Response } from "express";

import { AUTH_GLOBAL_SCOPE } from "@common/auth";

import { ConfigCookieService } from "./config-cookie.service";

@Injectable()
export class AuthCookieService {
    constructor(private readonly configCookieService: ConfigCookieService) {}

    getRefreshTokenFromRequestCookies(
        cookies: Record<string, unknown>,
        scope: AUTH_GLOBAL_SCOPE
    ): string | null {
        const cookieName = this.configCookieService.getCookieNames(scope).refresh;
        const value = cookies[cookieName];
        return typeof value === "string" && value.length > 0 ? value : null;
    }

    setAuthCookies(
        response: Response,
        scope: AUTH_GLOBAL_SCOPE,
        payload: { accessToken: string; refreshToken: string }
    ): void {
        const names = this.configCookieService.getCookieNames(scope);
        const { access, refresh } = this.configCookieService.getCookieConfig(scope);
        response.cookie(names.access, payload.accessToken, access);

        response.cookie(names.refresh, payload.refreshToken, refresh);
    }

    clearAuthCookies(response: Response, scope: AUTH_GLOBAL_SCOPE): void {
        const names = this.configCookieService.getCookieNames(scope);
        const domain = this.configCookieService.getDomain(scope);
        console.log("domain", domain);
        const clearOptions = {
            path: "/",
            domain: domain || undefined,
        };

        response.clearCookie(names.access, clearOptions);
        response.clearCookie(names.refresh, clearOptions);
    }
}
