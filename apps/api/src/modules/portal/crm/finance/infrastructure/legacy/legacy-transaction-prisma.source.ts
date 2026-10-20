import { Injectable } from "@nestjs/common";

import { PrismaService } from "@common/prisma/prisma.service";

import { LEDGER_SOURCES } from "../../domain/ledger/ledger-entry";
import {
    type LegacyTransaction,
    LegacyTransactionSource,
} from "../../domain/repositories/finance-sources.interface";

@Injectable()
export class LegacyTransactionPrismaSource extends LegacyTransactionSource {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async pending(): Promise<LegacyTransaction[]> {
        const moved = await this.prisma.ledgerEntry.findMany({
            where: { sourceType: LEDGER_SOURCES.legacy },
            select: { sourceId: true },
        });
        const done = new Set(moved.map((row) => row.sourceId));
        const rows = await this.prisma.financialTransaction.findMany({
            orderBy: { transactionDate: "asc" },
        });
        return rows
            .filter((row) => !done.has(row.id))
            .map((row) => ({
                id: row.id,
                portalId: row.portalId,
                type: row.type,
                direction: row.direction,
                amount: Number(row.amount),
                currency: row.currency,
                paymentMethod: row.paymentMethod,
                transactionDate: row.transactionDate,
                description: row.description,
                notes: row.notes,
                createdBy: row.createdBy,
            }));
    }
}
