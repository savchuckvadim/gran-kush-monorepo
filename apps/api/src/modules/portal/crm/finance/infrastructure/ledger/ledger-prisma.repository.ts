import { Injectable } from "@nestjs/common";

import { LedgerEntryStatus, type Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import {
    DomainEventPublisher,
    type EventsOf,
    type NewDomainEvent,
    type OutboxTransaction,
} from "@modules/events";

import { monthOf } from "../../domain/ledger/finance-period";
import type { LedgerEntry, LedgerSource } from "../../domain/ledger/ledger-entry";
import {
    type DocumentKey,
    documentKeyOf,
    type LedgerEntryChange,
    type LedgerFilter,
    LedgerRepository,
    type LedgerWrite,
    type NewLedgerEntry,
} from "../../domain/repositories/ledger-repository.interface";

import { LedgerCodec } from "./ledger-codec";
import { holdOpenMonths, lockOrderLedger } from "./ledger-locks";
import { LedgerLookup } from "./ledger-lookup";
import {
    fromDbDate,
    LEDGER_ENTRY_SELECT,
    type LedgerEntryRow,
    ledgerWhere,
    orderSaleWhere,
    toDbDate,
    toLedgerEntry,
} from "./ledger-rows";

@Injectable()
export class LedgerPrismaRepository extends LedgerRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: DomainEventPublisher,
        private readonly codec: LedgerCodec,
        private readonly lookup: LedgerLookup
    ) {
        super();
    }

    findDocument(
        portalId: string,
        counterpartyId: string,
        documentNumber: string,
        exceptId: string | null
    ): Promise<string | null> {
        return this.lookup.findDocument(portalId, counterpartyId, documentNumber, exceptId);
    }

    existingDocuments(portalId: string, keys: readonly DocumentKey[]): Promise<Set<string>> {
        return this.lookup.existingDocuments(portalId, keys);
    }

    existingSources(
        portalId: string,
        sourceType: LedgerSource,
        sourceIds: readonly string[]
    ): Promise<Set<string>> {
        return this.lookup.existingSources(portalId, sourceType, sourceIds);
    }

    async findById(portalId: string, id: string): Promise<LedgerEntry | null> {
        const row = await this.prisma.ledgerEntry.findFirst({
            where: { id, portalId },
            select: LEDGER_ENTRY_SELECT,
        });
        return row ? this.open(portalId, row) : null;
    }

    async attachmentPathOf(portalId: string, id: string): Promise<string | null> {
        const row = await this.prisma.ledgerEntry.findFirst({
            where: { id, portalId },
            select: { attachmentPath: true },
        });
        return row?.attachmentPath ?? null;
    }

    async list(
        portalId: string,
        filter: LedgerFilter,
        page: { skip: number; take: number }
    ): Promise<{ items: LedgerEntry[]; total: number }> {
        const where = ledgerWhere(portalId, filter);
        const [rows, total] = await Promise.all([
            this.prisma.ledgerEntry.findMany({
                where,
                select: LEDGER_ENTRY_SELECT,
                orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
                skip: page.skip,
                take: page.take,
            }),
            this.prisma.ledgerEntry.count({ where }),
        ]);
        return { items: await this.openAll(portalId, rows), total };
    }

    async listAll(portalId: string, filter: LedgerFilter): Promise<LedgerEntry[]> {
        const rows = await this.prisma.ledgerEntry.findMany({
            where: ledgerWhere(portalId, filter),
            select: LEDGER_ENTRY_SELECT,
            orderBy: [{ occurredOn: "asc" }, { createdAt: "asc" }],
        });
        return this.openAll(portalId, rows);
    }

    async create(
        portalId: string,
        entries: readonly NewLedgerEntry[],
        events: EventsOf<number>
    ): Promise<number> {
        const data = await Promise.all(entries.map((entry) => this.toRow(portalId, entry)));
        return this.prisma.$transaction(async (tx) => {
            await holdOpenMonths(
                tx,
                portalId,
                entries.map((entry) => monthOf(entry.occurredOn))
            );
            const { count } = await tx.ledgerEntry.createMany({ data, skipDuplicates: true });
            await this.events.publishMany(tx, events(count));
            return count;
        });
    }

    async createIn(
        tx: OutboxTransaction,
        portalId: string,
        entry: NewLedgerEntry,
        events: readonly NewDomainEvent[]
    ): Promise<void> {
        const data = await this.toRow(portalId, entry);
        await holdOpenMonths(tx, portalId, [monthOf(entry.occurredOn)]);
        await tx.ledgerEntry.create({ data });
        await this.events.publishMany(tx, events);
    }

    async update(
        portalId: string,
        id: string,
        change: LedgerEntryChange,
        events: readonly NewDomainEvent[]
    ): Promise<void> {
        const sealed = change.secret
            ? {
                  payload: await this.codec.sealEntry(portalId, id, change.secret),
                  documentIndex: await this.codec.documentIndex(
                      portalId,
                      change.secret.documentNumber
                  ),
              }
            : {};
        await this.prisma.$transaction(async (tx) => {
            const current = await tx.ledgerEntry.findFirstOrThrow({
                where: { id, portalId },
                select: { occurredOn: true },
            });
            const months = [monthOf(fromDbDate(current.occurredOn))];
            if (change.occurredOn) months.push(monthOf(change.occurredOn));
            await holdOpenMonths(tx, portalId, months);
            await tx.ledgerEntry.update({
                where: { id, portalId },
                data: {
                    occurredOn: change.occurredOn ? toDbDate(change.occurredOn) : undefined,
                    categoryId: change.categoryId,
                    counterpartyId: change.counterpartyId,
                    account: change.account,
                    toAccount: change.toAccount,
                    documentType: change.documentType,
                    attachmentPath: change.attachmentPath,
                    ...sealed,
                },
            });
            await this.events.publishMany(tx, events);
        });
    }

    async markVoid(
        portalId: string,
        id: string,
        employeeId: string,
        events: readonly NewDomainEvent[]
    ): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            const current = await tx.ledgerEntry.findFirstOrThrow({
                where: { id, portalId },
                select: { occurredOn: true },
            });
            await holdOpenMonths(tx, portalId, [monthOf(fromDbDate(current.occurredOn))]);
            await tx.ledgerEntry.update({
                where: { id, portalId, status: LedgerEntryStatus.posted },
                data: {
                    status: LedgerEntryStatus.void,
                    voidedAt: new Date(),
                    voidedById: employeeId,
                },
            });
            await this.events.publishMany(tx, events);
        });
    }

    async reconcileOrderSale(
        portalId: string,
        orderId: string,
        plan: (sales: LedgerEntry[]) => Promise<LedgerWrite | null>
    ): Promise<LedgerWrite | null> {
        return this.prisma.$transaction(async (tx) => {
            await lockOrderLedger(tx, orderId);
            const rows = await tx.ledgerEntry.findMany({
                where: orderSaleWhere(portalId, orderId),
                select: LEDGER_ENTRY_SELECT,
                orderBy: { createdAt: "asc" },
            });
            const write = await plan(await this.openAll(portalId, rows));
            if (!write) return null;
            const data = await Promise.all(write.entries.map((e) => this.toRow(portalId, e)));
            await holdOpenMonths(
                tx,
                portalId,
                write.entries.map((e) => monthOf(e.occurredOn))
            );
            await tx.ledgerEntry.createMany({ data });
            await this.events.publishMany(tx, write.events);
            return write;
        });
    }

    private async toRow(
        portalId: string,
        entry: NewLedgerEntry
    ): Promise<Prisma.LedgerEntryCreateManyInput> {
        const { secret, occurredOn, ...open } = entry;
        return {
            ...open,
            portalId,
            occurredOn: toDbDate(occurredOn),
            documentIndex: await this.codec.documentIndex(portalId, secret.documentNumber),
            payload: await this.codec.sealEntry(portalId, entry.id, secret),
        };
    }

    private async open(portalId: string, row: LedgerEntryRow): Promise<LedgerEntry> {
        return toLedgerEntry(row, await this.codec.openEntry(portalId, row.id, row.payload));
    }

    private openAll(portalId: string, rows: readonly LedgerEntryRow[]): Promise<LedgerEntry[]> {
        return Promise.all(rows.map((row) => this.open(portalId, row)));
    }
}
