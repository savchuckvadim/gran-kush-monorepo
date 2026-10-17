import { Injectable } from "@nestjs/common";

import { Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";

import type {
    AuthTokenPurpose,
    AuthTokenSubject,
    ConsumeAuthTokenResult,
} from "../domain/auth-token";
import {
    AuthTokenRepository,
    type IssueAuthTokenData,
} from "../domain/auth-token-repository.interface";

const subjectWhere = (subject: AuthTokenSubject): Prisma.AuthTokenWhereInput =>
    "userId" in subject ? { userId: subject.userId } : { email: subject.email, userId: null };

@Injectable()
export class AuthTokenPrismaRepository extends AuthTokenRepository {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async issue(data: IssueAuthTokenData): Promise<void> {
        await this.prisma.$transaction([
            this.prisma.authToken.deleteMany({
                where: { purpose: data.purpose, consumedAt: null, ...subjectWhere(data.subject) },
            }),
            this.prisma.authToken.create({
                data: {
                    purpose: data.purpose,
                    tokenHash: data.tokenHash,
                    userId: "userId" in data.subject ? data.subject.userId : null,
                    email: "email" in data.subject ? data.subject.email : null,
                    payload: data.payload as Prisma.InputJsonObject | undefined,
                    expiresAt: data.expiresAt,
                },
            }),
        ]);
    }

    async consume(
        purposes: AuthTokenPurpose[],
        tokenHash: string,
        now: Date
    ): Promise<ConsumeAuthTokenResult> {
        const row = await this.prisma.authToken.findUnique({ where: { tokenHash } });
        if (!row || !purposes.includes(row.purpose) || row.consumedAt !== null) {
            return { kind: "invalid" };
        }
        if (row.expiresAt <= now) return { kind: "expired" };

        const { count } = await this.prisma.authToken.updateMany({
            where: { id: row.id, consumedAt: null },
            data: { consumedAt: now },
        });
        if (count !== 1) return { kind: "invalid" };
        return {
            kind: "consumed",
            token: {
                purpose: row.purpose,
                userId: row.userId,
                email: row.email,
                payload: row.payload,
            },
        };
    }

    async revokeForUser(userId: string, purposes: AuthTokenPurpose[]): Promise<void> {
        await this.prisma.authToken.deleteMany({
            where: { userId, purpose: { in: purposes }, consumedAt: null },
        });
    }

    async deleteStale(now: Date, consumedBefore: Date): Promise<number> {
        const { count } = await this.prisma.authToken.deleteMany({
            where: { OR: [{ expiresAt: { lt: now } }, { consumedAt: { lt: consumedBefore } }] },
        });
        return count;
    }
}
