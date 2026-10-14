import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { JWT_ENV_KEYS } from "@modules/portal/auth/domain/constants/jwt.constants";
import { GoogleOAuthGateway } from "@modules/portal/auth/social/domain/google-oauth.gateway";
import { GoogleProfile } from "@modules/portal/auth/social/domain/social-profile";

export type SocialApp = "member" | "crm";

const STATE_PURPOSE = "google_oauth";
const STATE_TTL = "10m";
export const SOCIAL_LOCALES = ["ru", "en", "es"] as const;
const DEFAULT_LOCALE = "es";

interface OAuthState {
    purpose: string;
    app: SocialApp;
    locale: string;
}

/**
 * Редирект-флоу Google OAuth: подписанный state (CSRF + к какому приложению
 * вернуться), redirect URI на самом API, обмен кода на профиль.
 */
@Injectable()
export class GoogleOAuthFlowService {
    constructor(
        private readonly google: GoogleOAuthGateway,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService
    ) {}

    isConfigured(): boolean {
        return this.google.isConfigured();
    }

    sanitizeLocale(locale: string | undefined): string {
        return SOCIAL_LOCALES.includes(locale as (typeof SOCIAL_LOCALES)[number])
            ? (locale as string)
            : DEFAULT_LOCALE;
    }

    buildStartUrl(app: SocialApp, locale: string | undefined): string {
        const state = this.jwtService.sign(
            {
                purpose: STATE_PURPOSE,
                app,
                locale: this.sanitizeLocale(locale),
            } satisfies OAuthState,
            { secret: this.secret(), expiresIn: STATE_TTL }
        );
        return this.google.buildAuthUrl({ redirectUri: this.redirectUri(app), state });
    }

    verifyState(app: SocialApp, state: string | undefined): { locale: string } {
        if (!state) {
            throw new UnauthorizedException("Missing OAuth state");
        }
        let decoded: OAuthState;
        try {
            decoded = this.jwtService.verify<OAuthState>(state, { secret: this.secret() });
        } catch {
            throw new UnauthorizedException("Invalid OAuth state");
        }
        if (decoded.purpose !== STATE_PURPOSE || decoded.app !== app) {
            throw new UnauthorizedException("Invalid OAuth state");
        }
        return { locale: this.sanitizeLocale(decoded.locale) };
    }

    async exchangeCode(app: SocialApp, code: string): Promise<GoogleProfile> {
        return this.google.exchangeCode({ code, redirectUri: this.redirectUri(app) });
    }

    frontendUrl(app: SocialApp): string {
        const key = app === "crm" ? "CRM_FRONTEND_URL" : "MEMBER_FRONTEND_URL";
        const fallback = app === "crm" ? "http://localhost:5000" : "http://localhost:5001";
        return (this.configService.get<string>(key) || fallback).replace(/\/+$/, "");
    }

    private redirectUri(app: SocialApp): string {
        const base = (
            this.configService.get<string>("API_PUBLIC_URL") || "http://localhost:3000"
        ).replace(/\/+$/, "");
        return app === "crm"
            ? `${base}/crm/auth/google/callback`
            : `${base}/lk/auth/google/callback`;
    }

    private secret(): string {
        return this.configService.getOrThrow<string>(JWT_ENV_KEYS.SECRET);
    }
}
