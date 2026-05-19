import { Prisma, Token } from "@prisma/client";

export type TokenWithUserAndMember = Prisma.TokenGetPayload<{
    include: { user: { include: { member: true } } };
}>;

export abstract class TokenRepository {
    abstract create(data: {
        token: string;
        userId: string;
        deviceId: string;
        portalId?: string;
        expiresAt: Date;
    }): Promise<Token>;

    /** Активный refresh: не revoked и не истёк */
    abstract findActiveByToken(token: string): Promise<TokenWithUserAndMember | null>;

    abstract revokeById(id: string): Promise<void>;

    /** Перед новым логином с того же устройства — снять все активные refresh этого user+device */
    abstract revokeAllActiveForUserDevice(userId: string, deviceId: string): Promise<void>;

    abstract deleteByToken(token: string): Promise<{ count: number }>;

    abstract deleteByUserId(userId: string): Promise<{ count: number }>;

    abstract deleteExpired(): Promise<{ count: number }>;
}
