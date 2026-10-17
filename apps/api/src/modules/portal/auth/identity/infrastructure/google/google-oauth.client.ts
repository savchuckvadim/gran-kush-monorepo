import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { CodeChallengeMethod, OAuth2Client } from "google-auth-library";

import { GoogleOAuthGateway } from "@modules/portal/auth/identity/domain/google-oauth.gateway";
import { GoogleProfile } from "@modules/portal/auth/identity/domain/google-profile";

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

    buildAuthUrl(input: {
        redirectUri: string;
        state: string;
        nonce: string;
        codeChallenge: string;
    }): string {
        const client = new OAuth2Client(this.clientId, this.clientSecret, input.redirectUri);
        return client.generateAuthUrl({
            scope: ["openid", "email", "profile"],
            state: input.state,
            prompt: "select_account",
            nonce: input.nonce,
            code_challenge: input.codeChallenge,
            code_challenge_method: CodeChallengeMethod.S256,
        });
    }

    async exchangeCode(input: {
        code: string;
        redirectUri: string;
        codeVerifier: string;
    }): Promise<GoogleProfile> {
        const client = new OAuth2Client(this.clientId, this.clientSecret, input.redirectUri);
        const { tokens } = await client.getToken({
            code: input.code,
            codeVerifier: input.codeVerifier,
        });
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
            givenName: payload.given_name ?? null,
            familyName: payload.family_name ?? null,
            locale: payload.locale ?? null,
            nonce: payload.nonce ?? null,
        };
    }
}
