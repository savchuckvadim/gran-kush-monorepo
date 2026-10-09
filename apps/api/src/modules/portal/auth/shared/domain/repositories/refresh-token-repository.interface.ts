import { PrincipalType, Prisma, RefreshToken } from "@prisma/client";

export type RefreshTokenWithUser = Prisma.RefreshTokenGetPayload<{
    include: { user: true };
}>;

export abstract class RefreshTokenRepository {
    /**
     * Refresh устройства: одна строка на principal+user+device (`@@unique` в схеме).
     * Новый вход с того же устройства заменяет прежний токен в этой строке.
     */
    abstract upsertForUserDevice(data: {
        token: string;
        principalType: PrincipalType;
        userId: string;
        deviceId: string;
        expiresAt: Date;
    }): Promise<RefreshToken>;

    /** Активный refresh: не revoked и не истёк */
    abstract findActiveByToken(
        token: string,
        principalType: PrincipalType
    ): Promise<RefreshTokenWithUser | null>;

    /**
     * Ротация compare-and-set: токен меняется, только если в строке всё ещё `currentToken`
     * и он активен. `false` — строку уже ротировал параллельный запрос или токен отозван.
     */
    abstract replaceToken(
        id: string,
        currentToken: string,
        next: { token: string; expiresAt: Date }
    ): Promise<boolean>;

    /**
     * Снять все активные refresh глобального аккаунта — во всех порталах и на всех
     * устройствах. Нужно при смене пароля: иначе угнанная сессия живёт ещё 7 дней
     * после того, как владелец сбросил пароль.
     */
    abstract revokeAllForUser(userId: string): Promise<number>;

    abstract revokeAllActiveForPlatformAdminDevice(
        platformAdminId: string,
        deviceId: string
    ): Promise<void>;

    abstract deleteByToken(token: string): Promise<{ count: number }>;

    abstract deleteByUser(principalType: PrincipalType, userId: string): Promise<{ count: number }>;

    abstract deleteExpired(): Promise<{ count: number }>;
}
