export interface LinkIdentityInput {
    userId: string;
    provider: string;
    providerUserId: string;
    email?: string;
    displayName?: string | null;
}

export abstract class UserIdentityRepository {
    abstract findUserIdByProvider(provider: string, providerUserId: string): Promise<string | null>;
    /** Привязывает identity к аккаунту; повторная привязка той же пары — идемпотентна. */
    abstract link(input: LinkIdentityInput): Promise<void>;
}
