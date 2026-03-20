import { Injectable } from "@nestjs/common";

import { createHash } from "crypto";

import { PrismaService } from "@common/prisma/prisma.service";

type SessionPrincipal = {
    portalId: string;
    userId?: string | null;
    employeeId?: string | null;
    memberId?: string | null;
    refreshToken: string;
    expiresAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
};

@Injectable()
export class AuthSessionService {
    constructor(private readonly prisma: PrismaService) {}

    async createSession(input: SessionPrincipal): Promise<void> {
        await this.prisma.authSession.create({
            data: {
                portalId: input.portalId,
                userId: input.userId || null,
                employeeId: input.employeeId || null,
                memberId: input.memberId || null,
                refreshTokenHash: this.hashRefreshToken(input.refreshToken),
                expiresAt: input.expiresAt,
                ipAddress: input.ipAddress || null,
                userAgent: input.userAgent || null,
            },
        });
    }

    async revokeByRefreshToken(refreshToken: string): Promise<void> {
        await this.prisma.authSession.updateMany({
            where: {
                refreshTokenHash: this.hashRefreshToken(refreshToken),
                revokedAt: null,
            },
            data: {
                revokedAt: new Date(),
            },
        });
    }

    async revokeAllByEmployee(employeeId: string): Promise<void> {
        await this.prisma.authSession.updateMany({
            where: {
                employeeId,
                revokedAt: null,
            },
            data: {
                revokedAt: new Date(),
            },
        });
    }

    private hashRefreshToken(refreshToken: string): string {
        return createHash("sha256").update(refreshToken).digest("hex");
    }
}
