import { Injectable } from "@nestjs/common";

import { LedgerEntryStatus } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { DomainEventPublisher, type NewDomainEvent } from "@modules/events";

import type { FinanceMonth, FinancePeriodState } from "../../domain/ledger/finance-period";
import {
    FinancePeriodRepository,
    type MonthActivity,
} from "../../domain/repositories/finance-period-repository.interface";
import { lockMonth } from "../ledger/ledger-locks";

const PERIOD_SELECT = { year: true, month: true, closedAt: true, closedById: true } as const;

@Injectable()
export class FinancePeriodPrismaRepository extends FinancePeriodRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: DomainEventPublisher
    ) {
        super();
    }

    list(portalId: string): Promise<FinancePeriodState[]> {
        return this.prisma.financePeriod.findMany({
            where: { portalId },
            select: PERIOD_SELECT,
            orderBy: [{ year: "desc" }, { month: "desc" }],
        });
    }

    async activity(portalId: string): Promise<MonthActivity[]> {
        const rows = await this.prisma.$queryRaw<{ year: number; month: number; count: bigint }[]>`
            SELECT EXTRACT(YEAR FROM "occurred_on")::int AS "year",
                   EXTRACT(MONTH FROM "occurred_on")::int AS "month",
                   COUNT(*) AS "count"
            FROM "ledger_entries"
            WHERE "portal_id" = ${portalId}
              AND "status" = ${LedgerEntryStatus.posted}::"ledger_entry_status"
            GROUP BY 1, 2
            ORDER BY 1 DESC, 2 DESC`;
        return rows.map((row) => ({
            year: row.year,
            month: row.month,
            entryCount: Number(row.count),
        }));
    }

    find(portalId: string, month: FinanceMonth): Promise<FinancePeriodState | null> {
        return this.prisma.financePeriod.findUnique({
            where: { portalId_year_month: { portalId, year: month.year, month: month.month } },
            select: PERIOD_SELECT,
        });
    }

    async close(
        portalId: string,
        month: FinanceMonth,
        employeeId: string,
        events: readonly NewDomainEvent[]
    ): Promise<boolean> {
        return this.prisma.$transaction(async (tx) => {
            await lockMonth(tx, portalId, month);
            const key = { portalId, year: month.year, month: month.month };
            const current = await tx.financePeriod.findUnique({
                where: { portalId_year_month: key },
                select: { closedAt: true },
            });
            if (current?.closedAt) return false;
            const closed = { closedAt: new Date(), closedById: employeeId };
            await tx.financePeriod.upsert({
                where: { portalId_year_month: key },
                create: { ...key, ...closed },
                update: closed,
            });
            await this.events.publishMany(tx, events);
            return true;
        });
    }

    async reopen(
        portalId: string,
        month: FinanceMonth,
        events: readonly NewDomainEvent[]
    ): Promise<boolean> {
        return this.prisma.$transaction(async (tx) => {
            await lockMonth(tx, portalId, month);
            const { count } = await tx.financePeriod.updateMany({
                where: { portalId, year: month.year, month: month.month, closedAt: { not: null } },
                data: { closedAt: null, closedById: null },
            });
            if (count === 0) return false;
            await this.events.publishMany(tx, events);
            return true;
        });
    }
}
