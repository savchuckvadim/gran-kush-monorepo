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

    async create(data: { token: string; userId: string; expiresAt: Date }): Promise<Token> {
        return this.prisma.token.create({
            data,
        });
    }

    async findByToken(token: string): Promise<TokenWithUserAndMember | null> {
        return this.prisma.token.findUnique({
            where: { token },
            include: { user: { include: { member: true } } },
        });
    }

    async findByUserId(userId: string): Promise<Token[]> {
        return this.prisma.token.findMany({
            where: { userId },
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
