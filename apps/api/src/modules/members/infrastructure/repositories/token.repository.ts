import { Injectable } from "@nestjs/common";

import {
    TokenRepository,
    TokenWithUserAndMember,
} from "@members/domain/repositories/token-repository.interface";
import { Token } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";

@Injectable()
export class TokenPrismaRepository implements TokenRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: {
        token: string;
        userId: string;
        deviceId: string;
        portalId?: string;
        expiresAt: Date;
    }): Promise<Token> {
        return this.prisma.token.create({
            data,
        });
    }

    async findActiveByToken(token: string): Promise<TokenWithUserAndMember | null> {
        return this.prisma.token.findFirst({
            where: {
                token,
                revoked: false,
                expiresAt: { gt: new Date() },
            },
            include: { user: { include: { member: true } } },
        });
    }

    async revokeById(id: string): Promise<void> {
        await this.prisma.token.update({
            where: { id },
            data: { revoked: true },
        });
    }

    async revokeAllActiveForUserDevice(userId: string, deviceId: string): Promise<void> {
        await this.prisma.token.updateMany({
            where: {
                userId,
                deviceId,
                revoked: false,
            },
            data: { revoked: true },
        });
    }

    async deleteByToken(token: string): Promise<{ count: number }> {
        return this.prisma.token.deleteMany({
            where: { token },
        });
    }

    async deleteByUserId(userId: string): Promise<{ count: number }> {
        return this.prisma.token.deleteMany({
            where: { userId },
        });
    }

    async deleteExpired(): Promise<{ count: number }> {
        return this.prisma.token.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date(),
                },
            },
        });
    }
}
