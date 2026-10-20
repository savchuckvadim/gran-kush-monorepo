import { Injectable } from "@nestjs/common";

import { type FinanceCategory as CategoryRow, LedgerDirection } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { DomainEventPublisher, type NewDomainEvent, type OutboxTransaction } from "@modules/events";

import type {
    CategoryDirection,
    FinanceCategory,
    FinanceCategoryPreset,
} from "../../domain/ledger/finance-category";
import {
    type FinanceCategoryChange,
    FinanceCategoryRepository,
    type NewFinanceCategory,
} from "../../domain/repositories/finance-category-repository.interface";

/** Свои статьи идут после пресета в порядке создания. */
const CUSTOM_SORT_ORDER = 1000;

const toDirection = (direction: LedgerDirection): CategoryDirection =>
    direction === LedgerDirection.income ? "income" : "expense";

const toCategory = (row: CategoryRow): FinanceCategory => ({
    id: row.id,
    code: row.code,
    name: row.name,
    direction: toDirection(row.direction),
    pgcAccount: row.pgcAccount,
    taxTreatment: row.taxTreatment,
    isPreset: row.isPreset,
    sortOrder: row.sortOrder,
    archivedAt: row.archivedAt,
});

@Injectable()
export class FinanceCategoryPrismaRepository extends FinanceCategoryRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: DomainEventPublisher
    ) {
        super();
    }

    async list(
        portalId: string,
        options: { includeArchived: boolean }
    ): Promise<FinanceCategory[]> {
        const rows = await this.prisma.financeCategory.findMany({
            where: { portalId, ...(options.includeArchived ? {} : { archivedAt: null }) },
            orderBy: [{ direction: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
        });
        return rows.map(toCategory);
    }

    async findById(portalId: string, id: string): Promise<FinanceCategory | null> {
        const row = await this.prisma.financeCategory.findFirst({ where: { id, portalId } });
        return row ? toCategory(row) : null;
    }

    async findByCode(portalId: string, code: string): Promise<FinanceCategory | null> {
        const row = await this.prisma.financeCategory.findUnique({
            where: { portalId_code: { portalId, code } },
        });
        return row ? toCategory(row) : null;
    }

    async seedPresets(
        portalId: string,
        presets: readonly FinanceCategoryPreset[],
        tx?: OutboxTransaction
    ): Promise<void> {
        await (tx ?? this.prisma).financeCategory.createMany({
            data: presets.map((preset) => ({
                portalId,
                code: preset.code,
                direction: preset.direction,
                pgcAccount: preset.pgcAccount,
                taxTreatment: preset.taxTreatment,
                sortOrder: preset.sortOrder,
                isPreset: true,
            })),
            skipDuplicates: true,
        });
    }

    async create(
        portalId: string,
        category: NewFinanceCategory,
        events: (created: FinanceCategory) => NewDomainEvent[]
    ): Promise<FinanceCategory> {
        return this.prisma.$transaction(async (tx) => {
            const row = await tx.financeCategory.create({
                data: { portalId, ...category, sortOrder: CUSTOM_SORT_ORDER },
            });
            const created = toCategory(row);
            await this.events.publishMany(tx, events(created));
            return created;
        });
    }

    async update(
        portalId: string,
        id: string,
        change: FinanceCategoryChange,
        events: readonly NewDomainEvent[]
    ): Promise<FinanceCategory> {
        return this.prisma.$transaction(async (tx) => {
            const row = await tx.financeCategory.update({ where: { id, portalId }, data: change });
            await this.events.publishMany(tx, events);
            return toCategory(row);
        });
    }

    async archive(portalId: string, id: string, events: readonly NewDomainEvent[]): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            await tx.financeCategory.update({
                where: { id, portalId },
                data: { archivedAt: new Date() },
            });
            await this.events.publishMany(tx, events);
        });
    }
}
