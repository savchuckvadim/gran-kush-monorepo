import type {
    AuthSession,
    SessionAccount,
    SessionAudience,
    SessionRevokeReason,
    SessionSecrets,
    SignInMethod,
} from "./auth-session";

export interface StartSessionData {
    id: string;
    userId: string;
    audience: SessionAudience;
    deviceId: string;
    signInMethod: SignInMethod;
    refreshTokenHash: string;
    userAgent: string | null;
    ipAddress: string | null;
    expiresAt: Date;
}

export abstract class AuthSessionRepository {
    /**
     * Новая сессия устройства в аудитории. Прежняя сессия того же устройства удаляется: её токены
     * ссылаются на исчезнувший id и просто перестают работать, а не считаются кражей.
     */
    abstract start(data: StartSessionData): Promise<AuthSession>;

    abstract findWithAccount(
        id: string
    ): Promise<{ session: AuthSession & SessionSecrets; account: SessionAccount } | null>;

    /** Compare-and-set по текущему хешу: из двух одновременных ротаций проходит одна. */
    abstract rotate(
        id: string,
        expectedHash: string,
        next: { refreshTokenHash: string; expiresAt: Date; at: Date }
    ): Promise<boolean>;

    /*
     * Каждый отзыв пишет событие `session.revoked` в той же транзакции: realtime-шлюз рвёт
     * сокеты отозванной сессии сразу (TASK-794).
     */
    abstract revoke(id: string, reason: SessionRevokeReason): Promise<void>;

    /** Отзыв из списка устройств: только своей и ещё живой сессии; `false` — такой нет. */
    abstract revokeOwned(id: string, userId: string, reason: SessionRevokeReason): Promise<boolean>;

    abstract revokeAllForUser(
        userId: string,
        reason: SessionRevokeReason,
        exceptSessionId?: string
    ): Promise<number>;

    abstract listActiveForUser(userId: string, now: Date): Promise<AuthSession[]>;

    /** Уборка: истёкшие и давно отозванные сессии. */
    abstract deleteStale(now: Date, revokedBefore: Date): Promise<number>;
}
