import { LedgerEntryStatus, type Prisma } from "@prisma/client";

import {
    LEDGER_SOURCES,
    type LedgerEntry,
    type LedgerSecret,
    type LedgerSource,
} from "../../domain/ledger/ledger-entry";
import type { LedgerFilter } from "../../domain/repositories/ledger-repository.interface";

export const LEDGER_ENTRY_SELECT = {
    id: true,
    direction: true,
    status: true,
    occurredOn: true,
    categoryId: true,
    counterpartyId: true,
    account: true,
    toAccount: true,
    currency: true,
    documentType: true,
    payload: true,
    attachmentPath: true,
    sourceType: true,
    sourceId: true,
    reversalOfId: true,
    createdById: true,
    createdAt: true,
    updatedAt: true,
    voidedAt: true,
    reversal: { select: { id: true } },
} satisfies Prisma.LedgerEntrySelect;

export type LedgerEntryRow = Prisma.LedgerEntryGetPayload<{ select: typeof LEDGER_ENTRY_SELECT }>;

/** Колонка `date` ↔ `YYYY-MM-DD`: дата операции без времени и часового пояса. */
export const toDbDate = (date: string): Date => new Date(`${date}T00:00:00.000Z`);

export const fromDbDate = (date: Date): string => date.toISOString().slice(0, 10);

const SOURCES: ReadonlySet<string> = new Set(Object.values(LEDGER_SOURCES));

const isLedgerSource = (value: string): value is LedgerSource => SOURCES.has(value);

const asSource = (value: string): LedgerSource =>
    isLedgerSource(value) ? value : LEDGER_SOURCES.manual;

export const toLedgerEntry = (row: LedgerEntryRow, secret: LedgerSecret): LedgerEntry => ({
    id: row.id,
    direction: row.direction,
    status: row.status,
    occurredOn: fromDbDate(row.occurredOn),
    categoryId: row.categoryId,
    counterpartyId: row.counterpartyId,
    account: row.account,
    toAccount: row.toAccount,
    currency: row.currency,
    documentType: row.documentType,
    sourceType: asSource(row.sourceType),
    sourceId: row.sourceId,
    reversalOfId: row.reversalOfId,
    reversedById: row.reversal?.id ?? null,
    hasAttachment: row.attachmentPath !== null,
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    voidedAt: row.voidedAt,
    secret,
});

/** Условие выборки по открытым колонкам. Счёт перевода — и откуда, и куда ушли деньги. */
export const ledgerWhere = (
    portalId: string,
    filter: LedgerFilter
): Prisma.LedgerEntryWhereInput => ({
    portalId,
    ...(filter.includeVoid ? {} : { status: LedgerEntryStatus.posted }),
    ...(filter.direction ? { direction: filter.direction } : {}),
    ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
    ...(filter.counterpartyId ? { counterpartyId: filter.counterpartyId } : {}),
    ...(filter.account ? { OR: [{ account: filter.account }, { toAccount: filter.account }] } : {}),
    ...(filter.from || filter.to
        ? {
              occurredOn: {
                  ...(filter.from ? { gte: toDbDate(filter.from) } : {}),
                  ...(filter.to ? { lte: toDbDate(filter.to) } : {}),
              },
          }
        : {}),
});

/** Проводки оплаты заказа и их сторно: источник `order_sale` с id `<orderId>#<n>`. */
export const orderSaleWhere = (portalId: string, orderId: string): Prisma.LedgerEntryWhereInput => {
    const sale = {
        sourceType: LEDGER_SOURCES.orderSale,
        sourceId: { startsWith: `${orderId}#` },
    };
    return { portalId, OR: [sale, { reversalOf: sale }] };
};
