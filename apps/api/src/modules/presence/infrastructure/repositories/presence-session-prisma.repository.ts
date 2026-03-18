import { Injectable } from "@nestjs/common";

import { PresenceSession } from "@presence/domain/entity/presence-session.entity";
import {
    PresenceFilters,
    PresenceSessionRepository,
    PresenceStats,
} from "@presence/domain/repositories/presence-session-repository.interface";
import { SESSION_INCLUDE } from "@presence/infrastructure/prisma-includes";
import { Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";

@Injectable()
export class PresenceSessionPrismaRepository extends PresenceSessionRepository {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    // ─── findById ────────────────────────────────────────────────────────────

    async findById(id: string): Promise<PresenceSession | null> {
        const row = await this.prisma.presenceSession.findUnique({
            where: { id },
            include: SESSION_INCLUDE,
        });
        return row ? this.mapToEntity(row) : null;
    }

    // ─── findActiveByMemberId ────────────────────────────────────────────────

    async findActiveByMemberId(memberId: string): Promise<PresenceSession | null> {
        const row = await this.prisma.presenceSession.findFirst({
            where: { memberId, exitedAt: null },
            include: SESSION_INCLUDE,
            orderBy: { enteredAt: "desc" },
        });
        return row ? this.mapToEntity(row) : null;
    }

    // ─── findAll ─────────────────────────────────────────────────────────────

    async findAll(
        filters?: PresenceFilters,
        limit?: number,
        skip?: number,
        sortBy?: string,
        sortOrder?: "asc" | "desc"
    ): Promise<PresenceSession[]> {
        const where = this.buildWhere(filters);
        const orderBy = this.buildOrderBy(sortBy, sortOrder);

        const rows = await this.prisma.presenceSession.findMany({
            where,
            include: SESSION_INCLUDE,
            take: limit,
            skip,
            orderBy,
        });

        return rows.map((row) => this.mapToEntity(row));
    }

    // ─── count ───────────────────────────────────────────────────────────────

    async count(filters?: PresenceFilters): Promise<number> {
        const where = this.buildWhere(filters);
        return this.prisma.presenceSession.count({ where });
    }

    // ─── createEntry ─────────────────────────────────────────────────────────

    async createEntry(data: {
        memberId: string;
        employeeId?: string;
        entryMethod: string;
    }): Promise<PresenceSession> {
        const row = await this.prisma.presenceSession.create({
            data: {
                memberId: data.memberId,
                employeeId: data.employeeId,
                entryMethod: data.entryMethod,
            },
            include: SESSION_INCLUDE,
        });
        return this.mapToEntity(row);
    }

    // ─── closeSession ────────────────────────────────────────────────────────

    async closeSession(
        id: string,
        data: { exitMethod: string; employeeId?: string }
    ): Promise<PresenceSession> {
        const updateData: Prisma.PresenceSessionUpdateInput = {
            exitedAt: new Date(),
            exitMethod: data.exitMethod,
        };
        if (data.employeeId) {
            updateData.employee = { connect: { id: data.employeeId } };
        }

        const row = await this.prisma.presenceSession.update({
            where: { id },
            data: updateData,
            include: SESSION_INCLUDE,
        });
        return this.mapToEntity(row);
    }

    // ─── findAllActive ───────────────────────────────────────────────────────

    async findAllActive(): Promise<PresenceSession[]> {
        const rows = await this.prisma.presenceSession.findMany({
            where: { exitedAt: null },
            include: SESSION_INCLUDE,
            orderBy: { enteredAt: "asc" },
        });
        return rows.map((row) => this.mapToEntity(row));
    }

    // ─── closeMany ───────────────────────────────────────────────────────────

    async closeMany(ids: string[], exitMethod: string): Promise<number> {
        const result = await this.prisma.presenceSession.updateMany({
            where: { id: { in: ids } },
            data: {
                exitedAt: new Date(),
                exitMethod,
            },
        });
        return result.count;
    }

    // ─── countCurrentlyPresent ───────────────────────────────────────────────

    async countCurrentlyPresent(): Promise<number> {
        return this.prisma.presenceSession.count({
            where: { exitedAt: null },
        });
    }

    // ─── getStats ────────────────────────────────────────────────────────────

    async getStats(startDate?: Date, endDate?: Date, memberId?: string): Promise<PresenceStats> {
        const where: Prisma.PresenceSessionWhereInput = {};
        if (memberId) where.memberId = memberId;
        if (startDate || endDate) {
            where.enteredAt = {};
            if (startDate) where.enteredAt.gte = startDate;
            if (endDate) where.enteredAt.lte = endDate;
        }

        const [currentlyPresent, totalVisits, avgResult] = await Promise.all([
            this.countCurrentlyPresent(),
            this.prisma.presenceSession.count({ where }),
            this.prisma.$queryRaw<Array<{ avg_duration: number | null }>>`
                SELECT
                    AVG(EXTRACT(EPOCH FROM (exited_at - entered_at)) / 60) AS avg_duration
                FROM presence_sessions
                WHERE exited_at IS NOT NULL
                ${startDate ? Prisma.sql`AND entered_at >= ${startDate}` : Prisma.empty}
                ${endDate ? Prisma.sql`AND entered_at <= ${endDate}` : Prisma.empty}
                ${memberId ? Prisma.sql`AND member_id = ${memberId}` : Prisma.empty}
            `,
        ]);

        const avgDuration = avgResult[0]?.avg_duration;

        return {
            currentlyPresent,
            totalVisits,
            avgDurationMinutes: avgDuration !== null ? Math.round(avgDuration) : null,
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Private
    // ═══════════════════════════════════════════════════════════════════════════

    private buildWhere(filters?: PresenceFilters): Prisma.PresenceSessionWhereInput {
        if (!filters) return {};

        const where: Prisma.PresenceSessionWhereInput = {};

        if (filters.memberId) where.memberId = filters.memberId;
        if (filters.employeeId) where.employeeId = filters.employeeId;
        if (filters.entryMethod) where.entryMethod = filters.entryMethod;
        if (filters.exitMethod) where.exitMethod = filters.exitMethod;

        if (filters.isActive === true) {
            where.exitedAt = null;
        } else if (filters.isActive === false) {
            where.exitedAt = { not: null };
        }

        if (filters.startDate || filters.endDate) {
            where.enteredAt = {};
            if (filters.startDate) where.enteredAt.gte = filters.startDate;
            if (filters.endDate) where.enteredAt.lte = filters.endDate;
        }

        return where;
    }

    private buildOrderBy(
        sortBy?: string,
        sortOrder?: "asc" | "desc"
    ): Prisma.PresenceSessionOrderByWithRelationInput {
        const order = sortOrder ?? "desc";

        switch (sortBy) {
            case "enteredAt":
                return { enteredAt: order };
            case "exitedAt":
                return { exitedAt: order };
            default:
                return { createdAt: order };
        }
    }

    private mapToEntity(row: any): PresenceSession {
        return new PresenceSession({
            id: row.id,
            memberId: row.memberId,
            employeeId: row.employeeId,
            enteredAt: row.enteredAt,
            exitedAt: row.exitedAt,
            entryMethod: row.entryMethod,
            exitMethod: row.exitMethod,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            member: row.member ?? undefined,
            employee: row.employee ?? undefined,
        });
    }
}
