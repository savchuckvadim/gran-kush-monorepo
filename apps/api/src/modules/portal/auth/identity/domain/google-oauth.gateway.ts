import { GoogleProfile } from "@modules/portal/auth/identity/domain/google-profile";

/** Обмен с Google OAuth; за абстракцией — ради юнит-тестов без сети. */
export abstract class GoogleOAuthGateway {
    abstract isConfigured(): boolean;
    /**
     * Адрес согласия Google. `codeChallenge` — S256-хеш PKCE-verifier, `nonce` вернётся
     * внутри id_token: оба привязывают вход к браузеру, который его начал.
     */
    abstract buildAuthUrl(input: {
        redirectUri: string;
        state: string;
        nonce: string;
        codeChallenge: string;
    }): string;
    /** Обмен кода: Google принимает его только вместе с verifier, хеш которого пришёл в начале. */
    abstract exchangeCode(input: {
        code: string;
        redirectUri: string;
        codeVerifier: string;
    }): Promise<GoogleProfile>;
}
