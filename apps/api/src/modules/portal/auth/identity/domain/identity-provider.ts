import type { SessionAudience } from "@modules/portal/auth/sessions/domain/auth-session";

/**
 * Внешние способы входа (AUTH_ARCHITECTURE §6). Значения совпадают с enum `IdentityProvider` в БД:
 * новый провайдер — значение здесь и в схеме, адаптер в `infrastructure/` и кнопка на фронте.
 */
export const IDENTITY_PROVIDER_KEYS = { Google: "google", Telegram: "telegram" } as const;
export type IdentityProviderKey =
    (typeof IDENTITY_PROVIDER_KEYS)[keyof typeof IDENTITY_PROVIDER_KEYS];

export const isIdentityProviderKey = (value: string): value is IdentityProviderKey =>
    (Object.values(IDENTITY_PROVIDER_KEYS) as string[]).includes(value);

/** Профиль от провайдера в общем виде: сценарии входа и привязки работают только с ним. */
export interface ExternalProfile {
    provider: IdentityProviderKey;
    /** Стабильный id человека у провайдера (`sub` у Google, id у Telegram) */
    subject: string;
    email: string | null;
    /** Провайдер подтвердил владение адресом; без этого адрес ничего не доказывает */
    emailVerified: boolean;
    displayName: string | null;
    givenName: string | null;
    familyName: string | null;
    username: string | null;
    locale: string | null;
}

/** Что фронту нужно, чтобы показать кнопку (id бота Telegram и т. п.); секретов здесь нет. */
export type ProviderPublicConfig = Record<string, string | number | boolean | null>;

interface IdentityProviderBase {
    readonly key: IdentityProviderKey;
    /** Ключи провайдера заданы для этой аудитории — иначе кнопки нет */
    isEnabled(audience: SessionAudience): boolean;
    publicConfig(audience: SessionAudience): ProviderPublicConfig;
}

/**
 * OAuth-редирект (Google): браузер уходит к провайдеру и возвращается с кодом. State, куку
 * привязки и PKCE ведёт `OAuthRedirectFlowService`; адаптер только строит адрес и меняет код.
 */
export interface RedirectIdentityProvider extends IdentityProviderBase {
    readonly flow: "redirect";
    authorizationUrl(input: {
        redirectUri: string;
        state: string;
        nonce: string;
        codeChallenge: string;
    }): string;
    /** Обмен кода; адаптер сверяет `nonce` из ответа провайдера и бросает `IdentityError`. */
    exchange(input: {
        code: string;
        redirectUri: string;
        codeVerifier: string;
        nonce: string;
    }): Promise<ExternalProfile>;
}

/** Виджет на странице (Telegram): провайдер присылает подписанный профиль, адаптер его проверяет. */
export interface WidgetIdentityProvider extends IdentityProviderBase {
    readonly flow: "widget";
    verify(audience: SessionAudience, payload: Record<string, unknown>): ExternalProfile;
}

export type IdentityProviderAdapter = RedirectIdentityProvider | WidgetIdentityProvider;

const nullableString = (value: unknown): value is string | null =>
    value === null || typeof value === "string";

/** Профиль из сохранённого шага (билет, ссылка из письма); чужая форма — `null`. */
export const parseExternalProfile = (value: unknown): ExternalProfile | null => {
    if (typeof value !== "object" || value === null) return null;
    const p = value as Record<keyof ExternalProfile, unknown>;
    const strings = [p.email, p.displayName, p.givenName, p.familyName, p.username, p.locale];
    if (typeof p.provider !== "string" || !isIdentityProviderKey(p.provider)) return null;
    if (typeof p.subject !== "string" || typeof p.emailVerified !== "boolean") return null;
    if (!strings.every(nullableString)) return null;
    return {
        provider: p.provider,
        subject: p.subject,
        email: p.email as string | null,
        emailVerified: p.emailVerified,
        displayName: p.displayName as string | null,
        givenName: p.givenName as string | null,
        familyName: p.familyName as string | null,
        username: p.username as string | null,
        locale: p.locale as string | null,
    };
};
