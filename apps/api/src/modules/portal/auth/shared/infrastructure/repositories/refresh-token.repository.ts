import { Injectable } from "@nestjs/common";

import { PrincipalType, RefreshToken } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import {
    RefreshTokenRepository,
    RefreshTokenWithUser,
} from "@modules/portal/auth/shared/domain/repositories/refresh-token-repository.interface";

@Injectable()
export class RefreshTokenPrismaRepository implements RefreshTokenRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: {
        token: string;
        principalType: PrincipalType;
        userId?: string;
        platformAdminId?: string;
        deviceId: string;
        expiresAt: Date;
    }): Promise<RefreshToken> {
        return this.prisma.refreshToken.create({ data });
    }

    async findActiveByToken(
        token: string,
        principalType: PrincipalType
    ): Promise<RefreshTokenWithUser | null> {
        return this.prisma.refreshToken.findFirst({
            where: {
                token,
                principalType,
                revoked: false,
                expiresAt: { gt: new Date() },
            },
            include: { user: true },
        });
    }

    async revokeById(id: string): Promise<void> {
        await this.prisma.refreshToken.update({
            where: { id },
            data: { revoked: true },
        });
    }

    async revokeAllActiveForUserDevice(
        principalType: PrincipalType,
        userId: string,
        deviceId: string
    ): Promise<void> {
        await this.prisma.refreshToken.updateMany({
            where: { principalType, userId, deviceId, revoked: false },
            data: { revoked: true },
        });
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
        return this.prisma.refreshToken.deleteMany({ where: { token } });
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
