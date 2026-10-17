/** Fixed values and types of the OAuth redirect flow (`OAuthRedirectFlowService`). */
import type { SessionAudience } from "@modules/portal/auth/sessions/domain/auth-session";

import type { IdentityIntent } from "../../domain/identity-intent";
import type { IdentityProviderKey } from "../../domain/identity-provider";

export const FLOW_LOCALES = ["ru", "en", "es"] as const;
export const DEFAULT_LOCALE = "es";

/** Кука, которая привязывает вход к браузеру, начавшему его. */
export const OAUTH_FLOW_COOKIE = "oauth_flow";

export const STATE_PURPOSE = "oauth_redirect";
export const STATE_TTL = "10m";
export const FLOW_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;

/** Страница «Вход и безопасность»: туда возвращается привязка способа входа. */
export const LINK_RETURN_PATH: Record<SessionAudience, string> = {
    cabinet: "/me",
    crm: "/account/security",
};

export interface OAuthState {
    purpose: typeof STATE_PURPOSE;
    audience: SessionAudience;
    provider: IdentityProviderKey;
    locale: string;
    /** Привязка к браузеру: то же значение лежит в HttpOnly-куке и сверяется в callback. */
    nonce: string;
    /** Относительный путь возврата, уже проверенный `sanitizeReturnTo`. */
    returnTo?: string;
    intent?: IdentityIntent;
}

/** Секреты одного входа; ключ PKCE наружу не выходит — только в HttpOnly-куке. */
export interface OAuthBinding {
    nonce: string;
    codeVerifier: string;
}

export interface VerifiedCallback {
    locale: string;
    returnTo?: string;
    intent?: IdentityIntent;
    binding: OAuthBinding;
}

/** Почему возврат отклонён. Попадает в лог (без персональных данных); человек видит общую ошибку. */
export type OAuthFlowFailure =
    | "state_missing"
    | "state_invalid"
    | "binding_missing"
    | "binding_mismatch"
    | "provider_error";

export class OAuthFlowError extends Error {
    constructor(readonly reason: OAuthFlowFailure) {
        super(`OAuth redirect flow rejected: ${reason}`);
    }
}
