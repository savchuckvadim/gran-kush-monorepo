import { Injectable } from "@nestjs/common";

import { LedgerEntryStatus, type Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";

import type { LedgerSource } from "../../domain/ledger/ledger-entry";
import {
    type DocumentKey,
    documentKeyOf,
} from "../../domain/repositories/ledger-repository.interface";

import { LedgerCodec } from "./ledger-codec";
import { fromDbDate, toDbDate } from "./ledger-rows";

/** Дубль документа — среди проведённых и не отменённых сторно проводок. */
const LIVE_DOCUMENT = {
    status: LedgerEntryStatus.posted,
    reversalOfId: null,
    reversal: { is: null },
} satisfies Prisma.LedgerEntryWhereInput;

/** Поиск дублей по слепым индексам: документ контрагента, строка уже загруженного файла. */
@Injectable()
export class LedgerLookup {
    constructor(
        private readonly prisma: PrismaService,
        private readonly codec: LedgerCodec
    ) {}

    async findDocument(
        portalId: string,
        counterpartyId: string,
        documentNumber: string,
        exceptId: string | null
    ): Promise<string | null> {
        const documentIndex = await this.codec.documentIndex(portalId, documentNumber);
        const row = await this.prisma.ledgerEntry.findFirst({
            where: {
                portalId,
                counterpartyId,
                documentIndex,
                ...LIVE_DOCUMENT,
                ...(exceptId ? { id: { not: exceptId } } : {}),
            },
            select: { id: true },
        });
        return row?.id ?? null;
    }

    async existingDocuments(portalId: string, keys: readonly DocumentKey[]): Promise<Set<string>> {
        if (keys.length === 0) return new Set();
        const indexed = await Promise.all(
            keys.map(async (key) => ({
                key,
                index: await this.codec.documentIndex(portalId, key.documentNumber),
            }))
        );
        const rows = await this.prisma.ledgerEntry.findMany({
            where: {
                portalId,
                ...LIVE_DOCUMENT,
                OR: indexed.map(({ key, index }) => ({
                    counterpartyId: key.counterpartyId,
                    documentIndex: index,
                    occurredOn: toDbDate(key.occurredOn),
                })),
            },
            select: { counterpartyId: true, documentIndex: true, occurredOn: true },
        });
        const found = new Set(
            rows.map((r) => `${r.counterpartyId}|${r.documentIndex}|${fromDbDate(r.occurredOn)}`)
        );
        return new Set(
            indexed
                .filter(({ key, index }) =>
                    found.has(`${key.counterpartyId}|${index}|${key.occurredOn}`)
                )
                .map(({ key }) => documentKeyOf(key))
        );
    }

    async existingSources(
        portalId: string,
        sourceType: LedgerSource,
        sourceIds: readonly string[]
    ): Promise<Set<string>> {
        if (sourceIds.length === 0) return new Set();
        const rows = await this.prisma.ledgerEntry.findMany({
            where: { portalId, sourceType, sourceId: { in: [...sourceIds] } },
            select: { sourceId: true },
        });
        return new Set(rows.flatMap((row) => (row.sourceId ? [row.sourceId] : [])));
    }
}
