import type { ExternalProfile, IdentityProviderKey } from "../identity-provider";

export interface LinkIdentityInput {
    userId: string;
    provider: IdentityProviderKey;
    providerUserId: string;
    email?: string | null;
    emailVerified?: boolean;
    displayName?: string | null;
    givenName?: string | null;
    familyName?: string | null;
    username?: string | null;
    locale?: string | null;
}

export interface LinkedIdentity {
    provider: IdentityProviderKey;
    providerUserId: string;
    /** Адрес у провайдера — для показа; у Telegram его нет */
    email: string | null;
    /** @username в Telegram; у Google — null */
    username: string | null;
}

/** Привязка профиля провайдера к аккаунту: всё, что стоит запомнить для показа и входа. */
export const identityLinkOf = (userId: string, profile: ExternalProfile): LinkIdentityInput => ({
    userId,
    provider: profile.provider,
    providerUserId: profile.subject,
    email: profile.email,
    emailVerified: profile.emailVerified,
    displayName:
        profile.displayName ||
        [profile.givenName, profile.familyName].filter(Boolean).join(" ") ||
        null,
    givenName: profile.givenName,
    familyName: profile.familyName,
    username: profile.username,
    locale: profile.locale,
});

export abstract class UserIdentityRepository {
    abstract findUserIdByProvider(
        provider: IdentityProviderKey,
        providerUserId: string
    ): Promise<string | null>;

    /**
     * Привязывает identity к аккаунту; повторная привязка той же пары идемпотентна и обновляет
     * профиль и время последнего входа.
     */
    abstract link(input: LinkIdentityInput): Promise<void>;

    /** Привязка провайдера к аккаунту; `null` — не привязан. */
    abstract findForUser(
        userId: string,
        provider: IdentityProviderKey
    ): Promise<LinkedIdentity | null>;

    /** Все привязки аккаунта — для «Вход и безопасность». */
    abstract listForUser(userId: string): Promise<LinkedIdentity[]>;

    /** Отвязать провайдера от аккаунта; число снятых привязок. */
    abstract unlink(userId: string, provider: IdentityProviderKey): Promise<number>;
}
