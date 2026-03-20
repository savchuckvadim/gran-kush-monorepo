import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { Response } from "express";

type CookieScope = "crm" | "site";

@Injectable()
export class AuthCookieService {
    constructor(private readonly configService: ConfigService) {}

    getRefreshTokenFromRequestCookies(
        cookies: Record<string, unknown>,
        scope: CookieScope
    ): string | null {
        const cookieName = this.getCookieNames(scope).refresh;
        const value = cookies[cookieName];
        return typeof value === "string" && value.length > 0 ? value : null;
    }

    setAuthCookies(
        response: Response,
        scope: CookieScope,
        payload: { accessToken: string; refreshToken: string }
    ): void {
        const names = this.getCookieNames(scope);
        const secure = this.isSecureCookies();
        const domain = this.configService.get<string>("AUTH_COOKIE_DOMAIN");

        response.cookie(names.access, payload.accessToken, {
            httpOnly: true,
            secure,
            sameSite: "lax",
            path: "/",
            domain: domain || undefined,
            maxAge: this.accessTokenMaxAgeMs(),
        });

        response.cookie(names.refresh, payload.refreshToken, {
            httpOnly: true,
            secure,
            sameSite: "lax",
            path: "/",
            domain: domain || undefined,
            maxAge: this.refreshTokenMaxAgeMs(),
        });
    }

    clearAuthCookies(response: Response, scope: CookieScope): void {
        const names = this.getCookieNames(scope);
        const domain = this.configService.get<string>("AUTH_COOKIE_DOMAIN");
        const clearOptions = {
            path: "/",
            domain: domain || undefined,
        };

        response.clearCookie(names.access, clearOptions);
        response.clearCookie(names.refresh, clearOptions);
    }

    private getCookieNames(scope: CookieScope): { access: string; refresh: string } {
        if (scope === "site") {
            return {
                access:
                    this.configService.get<string>("SITE_ACCESS_COOKIE_NAME") ||
                    "site_access_token",
                refresh:
                    this.configService.get<string>("SITE_REFRESH_COOKIE_NAME") ||
                    "site_refresh_token",
            };
        }

        return {
            access: this.configService.get<string>("CRM_ACCESS_COOKIE_NAME") || "crm_access_token",
            refresh:
                this.configService.get<string>("CRM_REFRESH_COOKIE_NAME") || "crm_refresh_token",
        };
    }

    private isSecureCookies(): boolean {
        const explicit = this.configService.get<string>("AUTH_COOKIE_SECURE");
        if (explicit === "true") return true;
        if (explicit === "false") return false;
        return this.configService.get<string>("NODE_ENV") === "production";
    }

    private accessTokenMaxAgeMs(): number {
        return this.parseDurationToMs(
            this.configService.get<string>("JWT_ACCESS_TOKEN_EXPIRES_IN") || "15m"
        );
    }

    private refreshTokenMaxAgeMs(): number {
        return this.parseDurationToMs(
            this.configService.get<string>("JWT_REFRESH_TOKEN_EXPIRES_IN") || "7d"
        );
    }

    private parseDurationToMs(value: string): number {
        const parsed = /^(\d+)([smhd])$/.exec(value.trim());
        if (!parsed) {
            return 7 * 24 * 60 * 60 * 1000;
        }

        const amount = Number(parsed[1]);
        const unit = parsed[2];
        const multiplier =
            unit === "s" ? 1000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
        return amount * multiplier;
    }
}
