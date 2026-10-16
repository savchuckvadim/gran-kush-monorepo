/** Types and fixed values of the Google sign-in flow (`GoogleOAuthFlowService`). */

export type SocialApp = "member" | "crm";

export const SOCIAL_LOCALES = ["ru", "en", "es"] as const;
export const DEFAULT_LOCALE = "es";

/** Имя куки, которая привязывает вход к браузеру, начавшему его. */
export const OAUTH_FLOW_COOKIE = "google_oauth_flow";

export const STATE_PURPOSE = "google_oauth";
export const STATE_TTL = "10m";
export const FLOW_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;

/** Куда Google возвращает браузер; эти же адреса прописаны в OAuth-клиенте Google Cloud. */
export const CALLBACK_PATH: Record<SocialApp, string> = {
    crm: "/crm/auth/google/callback",
    member: "/cabinet/auth/google/callback",
};

/** Путь, на котором живёт кука привязки: только маршруты Google-входа этого приложения. */
export const FLOW_COOKIE_PATH: Record<SocialApp, string> = {
    crm: "/crm/auth/google",
    member: "/cabinet/auth/google",
};

/** Куда ведёт вход, если фронт не назвал страницу возврата. */
export const DEFAULT_LANDING: Record<SocialApp, (locale: string) => string> = {
    // CRM сама решает по клубам, куда отправить
    crm: (locale) => `/${locale}`,
    // Кабинет участника: его главная (мои клубы), а не лендинг
    member: (locale) => `/${locale}`,
};

/**
 * Зачем начат вход, кроме самого входа: принять приглашение сотрудника или завести клуб.
 * Проверяется при старте и едет в подписанном state, поэтому подменить его по пути нельзя.
 */
export type GoogleIntent = { kind: "invitation"; token: string } | { kind: "club_signup" };

/** Токен приглашения — hex из `randomBytes`; всё остальное отбрасывается до Google. */
export const INVITATION_TOKEN = /^[a-f0-9]{16,128}$/;

export interface OAuthState {
    purpose: string;
    app: SocialApp;
    locale: string;
    /** Привязка к браузеру: то же значение лежит в HttpOnly-куке и сверяется в callback. */
    nonce: string;
    /** Относительный путь возврата, уже проверенный по правилам `sanitizeReturnTo`. */
    returnTo?: string;
    intent?: GoogleIntent;
}

/** Секреты одного входа; ключ PKCE наружу не выходит — только в HttpOnly-куке. */
export interface OAuthBinding {
    nonce: string;
    codeVerifier: string;
}

/** Почему вход отклонён. Попадает в лог (без персональных данных); пользователь видит общую ошибку. */
export type GoogleFlowFailure =
    | "state_missing"
    | "state_invalid"
    | "binding_missing"
    | "binding_mismatch"
    | "provider_error"
    | "nonce_mismatch"
    | "exchange_failed";

export class GoogleFlowError extends Error {
    constructor(readonly reason: GoogleFlowFailure) {
        super(`Google OAuth flow rejected: ${reason}`);
    }
}
