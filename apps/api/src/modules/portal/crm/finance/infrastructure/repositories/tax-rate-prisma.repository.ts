import { Injectable } from "@nestjs/common";

import type { TaxRate as TaxRateRow } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { DomainEventPublisher, type NewDomainEvent, type OutboxTransaction } from "@modules/events";

import {
    type NewTaxRate,
    type TaxRateChange,
    TaxRateRepository,
} from "../../domain/repositories/tax-rate-repository.interface";
import type { TaxRate, TaxRatePreset } from "../../domain/tax/tax-rate";

/** Свои ставки идут после пресета в порядке создания. */
const CUSTOM_SORT_ORDER = 100;

const toTaxRate = (row: TaxRateRow): TaxRate => ({
    id: row.id,
    presetCode: row.presetCode,
    name: row.name,
    percent: Number(row.percent),
    treatment: row.treatment,
    isDefault: row.isDefault,
    sortOrder: row.sortOrder,
    archivedAt: row.archivedAt,
});

@Injectable()
export class TaxRatePrismaRepository extends TaxRateRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: DomainEventPublisher
    ) {
        super();
    }

    async list(portalId: string, options: { includeArchived: boolean }): Promise<TaxRate[]> {
        const rows = await this.prisma.taxRate.findMany({
            where: { portalId, ...(options.includeArchived ? {} : { archivedAt: null }) },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        });
        return rows.map(toTaxRate);
    }

    async findById(portalId: string, id: string): Promise<TaxRate | null> {
        const row = await this.prisma.taxRate.findFirst({ where: { id, portalId } });
        return row ? toTaxRate(row) : null;
    }

    async seedPresets(
        portalId: string,
        presets: readonly TaxRatePreset[],
        defaultCode: string,
        tx: OutboxTransaction
    ): Promise<void> {
        await tx.taxRate.createMany({
            data: presets.map((preset) => ({
                portalId,
                presetCode: preset.code,
                percent: preset.percent,
                treatment: preset.treatment,
                sortOrder: preset.sortOrder,
            })),
            skipDuplicates: true,
        });
        const hasDefault = await tx.taxRate.count({
            where: { portalId, isDefault: true, archivedAt: null },
        });
        if (!hasDefault) {
            await tx.taxRate.updateMany({
                where: { portalId, presetCode: defaultCode, archivedAt: null },
                data: { isDefault: true },
            });
        }
    }

    async create(
        portalId: string,
        rate: NewTaxRate,
        events: (created: TaxRate) => NewDomainEvent[]
    ): Promise<TaxRate> {
        return this.prisma.$transaction(async (tx) => {
            const row = await tx.taxRate.create({
                data: { portalId, ...rate, sortOrder: CUSTOM_SORT_ORDER },
            });
            const created = toTaxRate(row);
            await this.events.publishMany(tx, events(created));
            return created;
        });
    }

    async update(
        portalId: string,
        id: string,
        change: TaxRateChange,
        events: readonly NewDomainEvent[]
    ): Promise<TaxRate> {
        return this.prisma.$transaction(async (tx) => {
            const row = await tx.taxRate.update({ where: { id, portalId }, data: change });
            await this.events.publishMany(tx, events);
            return toTaxRate(row);
        });
    }

    async makeDefault(
        portalId: string,
        id: string,
        events: readonly NewDomainEvent[]
    ): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            await tx.$executeRaw`
                UPDATE "tax_rates" SET "is_default" = ("id" = ${id}), "updated_at" = NOW()
                WHERE "portal_id" = ${portalId} AND ("is_default" OR "id" = ${id})`;
            await this.events.publishMany(tx, events);
        });
    }

    async archive(portalId: string, id: string, events: readonly NewDomainEvent[]): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            await tx.taxRate.update({
                where: { id, portalId },
                data: { archivedAt: new Date(), isDefault: false },
            });
            await this.events.publishMany(tx, events);
        });
    }

    countProducts(portalId: string, id: string): Promise<number> {
        return this.prisma.product.count({ where: { portalId, taxRateId: id } });
    }
}
