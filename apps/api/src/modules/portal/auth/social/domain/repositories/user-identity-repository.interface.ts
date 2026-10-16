import type { IdentityProvider } from "@prisma/client";

export interface LinkIdentityInput {
    userId: string;
    provider: IdentityProvider;
    providerUserId: string;
    email?: string;
    emailVerified?: boolean;
    displayName?: string | null;
    givenName?: string | null;
    familyName?: string | null;
    username?: string | null;
    locale?: string | null;
}

export abstract class UserIdentityRepository {
    abstract findUserIdByProvider(
        provider: IdentityProvider,
        providerUserId: string
    ): Promise<string | null>;
    /**
     * Привязывает identity к аккаунту; повторная привязка той же пары идемпотентна и обновляет
     * профиль и время последнего входа.
     */
    abstract link(input: LinkIdentityInput): Promise<void>;
}
