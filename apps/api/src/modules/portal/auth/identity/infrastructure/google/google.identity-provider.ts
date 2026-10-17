import { Injectable } from "@nestjs/common";

import { timingSafeEqual } from "crypto";

import { GoogleOAuthGateway } from "../../domain/google-oauth.gateway";
import { IdentityError } from "../../domain/identity-error";
import {
    type ExternalProfile,
    IDENTITY_PROVIDER_KEYS,
    type ProviderPublicConfig,
    type RedirectIdentityProvider,
} from "../../domain/identity-provider";

const sameString = (left: string, right: string): boolean => {
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * Google: OAuth-редирект с id_token. Ключи одни на обе аудитории; адреса возврата
 * (`/{aud}/auth/google/callback`) прописаны в OAuth-клиенте Google Cloud.
 */
@Injectable()
export class GoogleIdentityProvider implements RedirectIdentityProvider {
    readonly key = IDENTITY_PROVIDER_KEYS.Google;
    readonly flow = "redirect";

    constructor(private readonly google: GoogleOAuthGateway) {}

    isEnabled(): boolean {
        return this.google.isConfigured();
    }

    publicConfig(): ProviderPublicConfig {
        return {};
    }

    authorizationUrl(input: {
        redirectUri: string;
        state: string;
        nonce: string;
        codeChallenge: string;
    }): string {
        return this.google.buildAuthUrl(input);
    }

    /** nonce из id_token должен совпасть с тем, что ушёл на старте: иначе id_token подменён. */
    async exchange(input: {
        code: string;
        redirectUri: string;
        codeVerifier: string;
        nonce: string;
    }): Promise<ExternalProfile> {
        const profile = await this.google.exchangeCode({
            code: input.code,
            redirectUri: input.redirectUri,
            codeVerifier: input.codeVerifier,
        });
        if (!profile.nonce || !sameString(profile.nonce, input.nonce)) {
            throw new IdentityError("signature", this.key);
        }
        return {
            provider: this.key,
            subject: profile.providerUserId,
            email: profile.email,
            emailVerified: profile.emailVerified,
            displayName: profile.displayName,
            givenName: profile.givenName,
            familyName: profile.familyName,
            username: null,
            locale: profile.locale,
        };
    }
}
