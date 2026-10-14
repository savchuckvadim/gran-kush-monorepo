import { GoogleProfile } from "@modules/portal/auth/social/domain/social-profile";

/** Обмен с Google OAuth; за абстракцией — ради юнит-тестов без сети. */
export abstract class GoogleOAuthGateway {
    abstract isConfigured(): boolean;
    abstract buildAuthUrl(input: { redirectUri: string; state: string }): string;
    abstract exchangeCode(input: { code: string; redirectUri: string }): Promise<GoogleProfile>;
}
