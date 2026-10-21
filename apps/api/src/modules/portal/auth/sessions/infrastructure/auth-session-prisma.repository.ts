import { Injectable } from "@nestjs/common";

import { Prisma, UserAccountStatus } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { DomainEventPublisher } from "@modules/events";

import { sessionRevokedEvents } from "../application/session-events";
import {
    type AppAuthSession,
    type AuthSession,
    isAppAudience,
    SESSION_AUDIENCES,
    type SessionAccount,
    type SessionRevokeReason,
    type SessionSecrets,
} from "../domain/auth-session";
import {
    AuthSessionRepository,
    type StartSessionData,
} from "../domain/auth-session-repository.interface";

type SessionRow = Prisma.AuthSessionGetPayload<object>;

const toSession = (row: SessionRow): AuthSession => ({
    id: row.id,
    userId: row.userId,
    audience: row.audience,
    deviceId: row.deviceId,
    signInMethod: row.signInMethod,
    userAgent: row.userAgent,
    ipAddress: row.ipAddress,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
});

@Injectable()
export class AuthSessionPrismaRepository extends AuthSessionRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: DomainEventPublisher
    ) {
        super();
    }

    async start(data: StartSessionData): Promise<AuthSession> {
        const row = await this.prisma.$transaction(async (tx) => {
            await tx.authSession.deleteMany({
                where: { userId: data.userId, audience: data.audience, deviceId: data.deviceId },
            });
            return tx.authSession.create({ data });
        });
        return toSession(row);
    }

    async findWithAccount(
        id: string
    ): Promise<{ session: AuthSession & SessionSecrets; account: SessionAccount } | null> {
        const row = await this.prisma.authSession.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        isActive: true,
                        emailConfirmed: true,
                        status: true,
                    },
                },
            },
        });
        if (!row) return null;
        return {
            session: {
                ...toSession(row),
                refreshTokenHash: row.refreshTokenHash,
                previousTokenHash: row.previousTokenHash,
                rotatedAt: row.rotatedAt,
            },
            account: {
                id: row.user.id,
                email: row.user.email,
                isActive: row.user.isActive,
                emailConfirmed: row.user.emailConfirmed,
                blocked: row.user.status === UserAccountStatus.blocked,
            },
        };
    }

    async rotate(
        id: string,
        expectedHash: string,
        next: { refreshTokenHash: string; expiresAt: Date; at: Date }
    ): Promise<boolean> {
        const { count } = await this.prisma.authSession.updateMany({
            where: { id, refreshTokenHash: expectedHash, revokedAt: null },
            data: {
                previousTokenHash: expectedHash,
                refreshTokenHash: next.refreshTokenHash,
                rotatedAt: next.at,
                lastUsedAt: next.at,
                expiresAt: next.expiresAt,
            },
        });
        return count === 1;
    }

    async revoke(id: string, reason: SessionRevokeReason): Promise<void> {
        await this.revokeWhere({ id, revokedAt: null }, reason);
    }

    async revokeOwned(id: string, userId: string, reason: SessionRevokeReason): Promise<boolean> {
        const revoked = await this.revokeWhere(
            { id, userId, revokedAt: null, expiresAt: { gt: new Date() } },
            reason
        );
        return revoked === 1;
    }

    async revokeAllForUser(
        userId: string,
        reason: SessionRevokeReason,
        exceptSessionId?: string
    ): Promise<number> {
        return this.revokeWhere(
            {
                userId,
                revokedAt: null,
                ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
            },
            reason
        );
    }

    /** Отзыв и его события `session.revoked` — одной транзакцией; возвращает число отозванных. */
    private async revokeWhere(
        where: Prisma.AuthSessionWhereInput,
        reason: SessionRevokeReason
    ): Promise<number> {
        return this.prisma.$transaction(async (tx) => {
            const revoked = await tx.authSession.updateManyAndReturn({
                where,
                data: { revokedAt: new Date(), revokeReason: reason },
                select: { id: true, userId: true, audience: true },
            });
            const events = sessionRevokedEvents(revoked, reason);
            if (events.length > 0) {
                await this.events.publishMany(tx, events);
            }
            return revoked.length;
        });
    }

    async listActiveForUser(userId: string, now: Date): Promise<AppAuthSession[]> {
        const rows = await this.prisma.authSession.findMany({
            where: {
                userId,
                revokedAt: null,
                expiresAt: { gt: now },
                audience: { in: Object.values(SESSION_AUDIENCES) },
            },
            orderBy: { lastUsedAt: "desc" },
        });
        return rows.flatMap((row) => {
            const { audience } = row;
            return isAppAudience(audience) ? [{ ...toSession(row), audience }] : [];
        });
    }

    async deleteStale(now: Date, revokedBefore: Date): Promise<number> {
        const { count } = await this.prisma.authSession.deleteMany({
            where: { OR: [{ expiresAt: { lt: now } }, { revokedAt: { lt: revokedBefore } }] },
        });
        return count;
    }
}
