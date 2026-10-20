import { Injectable } from "@nestjs/common";

import { CounterpartyKind, LedgerEntryStatus, type Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { DomainEventPublisher, type NewDomainEvent } from "@modules/events";

import type { Counterparty, CounterpartyDetails } from "../../domain/ledger/counterparty";
import {
    type CounterpartyChange,
    CounterpartyRepository,
    type NewCounterparty,
} from "../../domain/repositories/counterparty-repository.interface";
import { LedgerCodec } from "../ledger/ledger-codec";

const COUNTERPARTY_SELECT = {
    id: true,
    kind: true,
    memberId: true,
    details: true,
    archivedAt: true,
    createdAt: true,
} satisfies Prisma.CounterpartySelect;

type CounterpartyRow = Prisma.CounterpartyGetPayload<{ select: typeof COUNTERPARTY_SELECT }>;

@Injectable()
export class CounterpartyPrismaRepository extends CounterpartyRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: DomainEventPublisher,
        private readonly codec: LedgerCodec
    ) {
        super();
    }

    async list(portalId: string, options: { includeArchived: boolean }): Promise<Counterparty[]> {
        const rows = await this.prisma.counterparty.findMany({
            where: { portalId, ...(options.includeArchived ? {} : { archivedAt: null }) },
            select: COUNTERPARTY_SELECT,
            orderBy: { createdAt: "asc" },
        });
        return this.openAll(portalId, rows);
    }

    async findById(portalId: string, id: string): Promise<Counterparty | null> {
        const row = await this.prisma.counterparty.findFirst({
            where: { id, portalId },
            select: COUNTERPARTY_SELECT,
        });
        return row ? this.open(portalId, row) : null;
    }

    async findByIds(portalId: string, ids: readonly string[]): Promise<Counterparty[]> {
        if (ids.length === 0) return [];
        const rows = await this.prisma.counterparty.findMany({
            where: { portalId, id: { in: [...ids] } },
            select: COUNTERPARTY_SELECT,
        });
        return this.openAll(portalId, rows);
    }

    async findByNif(portalId: string, nif: string): Promise<Counterparty | null> {
        const nifIndex = await this.codec.nifIndex(portalId, nif);
        const row = await this.prisma.counterparty.findFirst({
            where: { portalId, nifIndex },
            select: COUNTERPARTY_SELECT,
        });
        return row ? this.open(portalId, row) : null;
    }

    async findMatches(
        portalId: string,
        query: { nifs: readonly string[]; names: readonly string[] }
    ): Promise<{ byNif: Map<string, Counterparty>; byName: Map<string, Counterparty> }> {
        const nifIndexes = new Map<string, string>();
        for (const nif of query.nifs) {
            const index = await this.codec.nifIndex(portalId, nif);
            if (index) nifIndexes.set(index, nif);
        }
        const nameIndexes = new Map<string, string>();
        for (const name of query.names) {
            nameIndexes.set(await this.codec.nameIndex(portalId, name), name);
        }
        const rows = await this.prisma.counterparty.findMany({
            where: {
                portalId,
                OR: [
                    { nifIndex: { in: [...nifIndexes.keys()] } },
                    { nameIndex: { in: [...nameIndexes.keys()] } },
                ],
            },
            select: { ...COUNTERPARTY_SELECT, nifIndex: true, nameIndex: true },
            orderBy: { createdAt: "asc" },
        });
        const byNif = new Map<string, Counterparty>();
        const byName = new Map<string, Counterparty>();
        for (const row of rows) {
            const counterparty = await this.open(portalId, row);
            const nif = row.nifIndex ? nifIndexes.get(row.nifIndex) : undefined;
            const name = row.nameIndex ? nameIndexes.get(row.nameIndex) : undefined;
            if (nif) byNif.set(nif, counterparty);
            if (name && !byName.has(name)) byName.set(name, counterparty);
        }
        return { byNif, byName };
    }

    async create(
        portalId: string,
        counterparty: NewCounterparty,
        events: readonly NewDomainEvent[]
    ): Promise<Counterparty> {
        const sealed = await this.seal(portalId, counterparty.id, counterparty.details);
        return this.prisma.$transaction(async (tx) => {
            const row = await tx.counterparty.create({
                data: { id: counterparty.id, portalId, kind: counterparty.kind, ...sealed },
                select: COUNTERPARTY_SELECT,
            });
            await this.events.publishMany(tx, events);
            return { ...this.shape(row), details: counterparty.details };
        });
    }

    async update(
        portalId: string,
        id: string,
        change: CounterpartyChange,
        events: readonly NewDomainEvent[]
    ): Promise<Counterparty> {
        const sealed = change.details ? await this.seal(portalId, id, change.details) : {};
        return this.prisma.$transaction(async (tx) => {
            const row = await tx.counterparty.update({
                where: { id, portalId },
                data: { kind: change.kind, ...sealed },
                select: COUNTERPARTY_SELECT,
            });
            await this.events.publishMany(tx, events);
            return this.open(portalId, row);
        });
    }

    async archive(portalId: string, id: string, events: readonly NewDomainEvent[]): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            await tx.counterparty.update({
                where: { id, portalId },
                data: { archivedAt: new Date() },
            });
            await this.events.publishMany(tx, events);
        });
    }

    async forMember(portalId: string, memberId: string): Promise<Counterparty> {
        const row = await this.prisma.counterparty.upsert({
            where: { portalId_memberId: { portalId, memberId } },
            create: { portalId, memberId, kind: CounterpartyKind.member },
            update: {},
            select: COUNTERPARTY_SELECT,
        });
        return this.shape(row);
    }

    async entryCounts(portalId: string): Promise<Map<string, number>> {
        const groups = await this.prisma.ledgerEntry.groupBy({
            by: ["counterpartyId"],
            where: { portalId, status: LedgerEntryStatus.posted, counterpartyId: { not: null } },
            _count: { _all: true },
        });
        const counts = new Map<string, number>();
        for (const group of groups) {
            if (group.counterpartyId) counts.set(group.counterpartyId, group._count._all);
        }
        return counts;
    }

    private async seal(portalId: string, id: string, details: CounterpartyDetails) {
        return {
            details: await this.codec.sealCounterparty(portalId, id, details),
            nifIndex: await this.codec.nifIndex(portalId, details.nif),
            nameIndex: await this.codec.nameIndex(portalId, details.name),
        };
    }

    private shape(row: CounterpartyRow): Counterparty {
        return {
            id: row.id,
            kind: row.kind,
            memberId: row.memberId,
            details: null,
            archivedAt: row.archivedAt,
            createdAt: row.createdAt,
        };
    }

    private async open(portalId: string, row: CounterpartyRow): Promise<Counterparty> {
        const details = row.details
            ? await this.codec.openCounterparty(portalId, row.id, row.details)
            : null;
        return { ...this.shape(row), details };
    }

    private openAll(portalId: string, rows: readonly CounterpartyRow[]): Promise<Counterparty[]> {
        return Promise.all(rows.map((row) => this.open(portalId, row)));
    }
}
