import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { OAuth2Client } from "google-auth-library";

import { GoogleOAuthGateway } from "@modules/portal/auth/social/domain/google-oauth.gateway";
import { GoogleProfile } from "@modules/portal/auth/social/domain/social-profile";

@Injectable()
export class GoogleOAuthClient extends GoogleOAuthGateway {
    constructor(private readonly configService: ConfigService) {
        super();
    }

    private get clientId(): string {
        return this.configService.get<string>("GOOGLE_CLIENT_ID") ?? "";
    }

    private get clientSecret(): string {
        return this.configService.get<string>("GOOGLE_CLIENT_SECRET") ?? "";
    }

    isConfigured(): boolean {
        return this.clientId.length > 0 && this.clientSecret.length > 0;
    }

    buildAuthUrl(input: { redirectUri: string; state: string }): string {
        const client = new OAuth2Client(this.clientId, this.clientSecret, input.redirectUri);
        return client.generateAuthUrl({
            scope: ["openid", "email", "profile"],
            state: input.state,
            prompt: "select_account",
        });
    }

    async exchangeCode(input: { code: string; redirectUri: string }): Promise<GoogleProfile> {
        const client = new OAuth2Client(this.clientId, this.clientSecret, input.redirectUri);
        const { tokens } = await client.getToken(input.code);
        if (!tokens.id_token) {
            throw new UnauthorizedException("Google did not return an id_token");
        }
        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: this.clientId,
        });
        const payload = ticket.getPayload();
        if (!payload?.sub || !payload.email) {
            throw new UnauthorizedException("Google did not return an email");
        }
        return {
            providerUserId: payload.sub,
            email: payload.email.toLowerCase(),
            emailVerified: payload.email_verified === true,
            displayName: payload.name ?? null,
        };
    }
}
