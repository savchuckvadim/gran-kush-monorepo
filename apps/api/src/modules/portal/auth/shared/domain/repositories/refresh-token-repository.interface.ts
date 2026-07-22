import { Prisma, PrincipalType, RefreshToken } from "@prisma/client";

export type RefreshTokenWithUser = Prisma.RefreshTokenGetPayload<{
    include: { user: true };
}>;

export abstract class RefreshTokenRepository {
    abstract create(data: {
        token: string;
        principalType: PrincipalType;
        userId?: string;
        platformAdminId?: string;
        deviceId: string;
        expiresAt: Date;
    }): Promise<RefreshToken>;

    /** Активный refresh: не revoked и не истёк */
    abstract findActiveByToken(
        token: string,
        principalType: PrincipalType
    ): Promise<RefreshTokenWithUser | null>;

    abstract revokeById(id: string): Promise<void>;

    /** Перед новым логином с того же устройства — снять все активные refresh этого principal+device */
    abstract revokeAllActiveForUserDevice(
        principalType: PrincipalType,
        userId: string,
        deviceId: string
    ): Promise<void>;

    abstract revokeAllActiveForPlatformAdminDevice(
        platformAdminId: string,
        deviceId: string
    ): Promise<void>;

    abstract deleteByToken(token: string): Promise<{ count: number }>;

    abstract deleteByUser(principalType: PrincipalType, userId: string): Promise<{ count: number }>;

    abstract deleteExpired(): Promise<{ count: number }>;
}
