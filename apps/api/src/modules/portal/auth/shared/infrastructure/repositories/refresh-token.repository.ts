import { Injectable } from "@nestjs/common";

import { PrincipalType, RefreshToken } from "@prisma/client";
import { createHash } from "crypto";

import { PrismaService } from "@common/prisma/prisma.service";
import {
    RefreshTokenRepository,
    RefreshTokenWithUser,
} from "@modules/portal/auth/shared/domain/repositories/refresh-token-repository.interface";

/**
 * В БД лежит только SHA-256 от refresh-токена (TASK-668): дамп таблицы не даёт
 * готовых сессий. Сам токен живёт лишь в HttpOnly-куке или у нативного клиента.
 */
const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

@Injectable()
export class RefreshTokenPrismaRepository implements RefreshTokenRepository {
    constructor(private readonly prisma: PrismaService) {}

    async upsertForUserDevice(data: {
        token: string;
        principalType: PrincipalType;
        userId: string;
        deviceId: string;
        expiresAt: Date;
    }): Promise<RefreshToken> {
        const { principalType, userId, deviceId, expiresAt } = data;
        const token = hashToken(data.token);
        return this.prisma.refreshToken.upsert({
            where: { principalType_userId_deviceId: { principalType, userId, deviceId } },
            create: { token, principalType, userId, deviceId, expiresAt },
            update: { token, expiresAt, revoked: false },
        });
    }

    async findActiveByToken(
        token: string,
        principalType: PrincipalType
    ): Promise<RefreshTokenWithUser | null> {
        return this.prisma.refreshToken.findFirst({
            where: {
                token: hashToken(token),
                principalType,
                revoked: false,
                expiresAt: { gt: new Date() },
            },
            include: { user: true },
        });
    }

    async replaceToken(
        id: string,
        currentToken: string,
        next: { token: string; expiresAt: Date }
    ): Promise<boolean> {
        const { count } = await this.prisma.refreshToken.updateMany({
            where: {
                id,
                token: hashToken(currentToken),
                revoked: false,
                expiresAt: { gt: new Date() },
            },
            data: { token: hashToken(next.token), expiresAt: next.expiresAt },
        });
        return count === 1;
    }

    async revokeAllForUser(userId: string): Promise<number> {
        // Без фильтра по principalType: member- и employee-мосты делят один
        // глобальный аккаунт, и пароль у них общий.
        const { count } = await this.prisma.refreshToken.updateMany({
            where: { userId, revoked: false },
            data: { revoked: true },
        });
        return count;
    }

    async revokeAllActiveForPlatformAdminDevice(
        platformAdminId: string,
        deviceId: string
    ): Promise<void> {
        await this.prisma.refreshToken.updateMany({
            where: {
                principalType: PrincipalType.platform_admin,
                platformAdminId,
                deviceId,
                revoked: false,
            },
            data: { revoked: true },
        });
    }

    async deleteByToken(token: string): Promise<{ count: number }> {
        return this.prisma.refreshToken.deleteMany({ where: { token: hashToken(token) } });
    }

    async deleteByUser(principalType: PrincipalType, userId: string): Promise<{ count: number }> {
        return this.prisma.refreshToken.deleteMany({ where: { principalType, userId } });
    }

    async deleteExpired(): Promise<{ count: number }> {
        return this.prisma.refreshToken.deleteMany({
            where: { expiresAt: { lt: new Date() } },
        });
    }
}
