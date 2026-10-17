import type { AuthTokenPurpose, AuthTokenSubject, ConsumeAuthTokenResult } from "./auth-token";

export interface IssueAuthTokenData {
    purpose: AuthTokenPurpose;
    subject: AuthTokenSubject;
    tokenHash: string;
    payload?: object;
    expiresAt: Date;
}

export abstract class AuthTokenRepository {
    /** Новая ссылка; непогашенные ссылки того же назначения и адресата удаляются в той же транзакции. */
    abstract issue(data: IssueAuthTokenData): Promise<void>;

    /**
     * Гасит ссылку атомарно: из двух одновременных запросов с одной ссылкой проходит один.
     * `purposes` — какие назначения принимает экран (форма пароля — и сброс, и первый пароль).
     */
    abstract consume(
        purposes: AuthTokenPurpose[],
        tokenHash: string,
        now: Date
    ): Promise<ConsumeAuthTokenResult>;

    /** Гасит непогашенные ссылки аккаунта — например, сброс пароля после смены пароля. */
    abstract revokeForUser(userId: string, purposes: AuthTokenPurpose[]): Promise<void>;

    /** Уборка: истёкшие и давно погашенные ссылки. */
    abstract deleteStale(now: Date, consumedBefore: Date): Promise<number>;
}
