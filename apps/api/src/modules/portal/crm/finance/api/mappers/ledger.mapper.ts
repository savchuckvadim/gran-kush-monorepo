import { LedgerEntryStatus } from "@prisma/client";

import type { LedgerEntryView } from "../../application/services/ledger-entries.service";
import { LEDGER_SOURCES } from "../../domain/ledger/ledger-entry";
import { fromCents } from "../../domain/ledger/ledger-money";
import { orderIdOfSale } from "../../domain/ledger/order-sale";
import type { EntryEditMode, LedgerEntryDto } from "../dto/ledger-entry.dto";

/** Те же правила, что в сценариях правки: CRM показывает только доступные действия. */
const editModeOf = (entry: LedgerEntryView): EntryEditMode => {
    if (entry.status === LedgerEntryStatus.void || entry.reversedById) return "none";
    if (entry.sourceType === LEDGER_SOURCES.reversal) return "notes";
    if (entry.sourceType === LEDGER_SOURCES.orderSale) return "classification";
    return "full";
};

export const toLedgerEntryDto = (entry: LedgerEntryView): LedgerEntryDto => ({
    id: entry.id,
    direction: entry.direction,
    status: entry.status,
    occurredOn: entry.occurredOn,
    categoryId: entry.categoryId,
    counterpartyId: entry.counterpartyId,
    counterpartyName: entry.counterpartyName,
    counterpartyNif: entry.counterpartyNif,
    account: entry.account,
    toAccount: entry.toAccount,
    currency: entry.currency,
    documentType: entry.documentType,
    documentNumber: entry.secret.documentNumber,
    documentDate: entry.secret.documentDate,
    paidOn: entry.secret.paidOn,
    description: entry.secret.description,
    notes: entry.secret.notes,
    sourceType: entry.sourceType,
    orderId:
        entry.sourceType === LEDGER_SOURCES.orderSale && entry.sourceId
            ? orderIdOfSale(entry.sourceId)
            : null,
    sourceLabel: entry.secret.sourceLabel,
    reversalOfId: entry.reversalOfId,
    reversedById: entry.reversedById,
    lines: entry.secret.lines.map((line) => ({
        percent: line.percent,
        treatment: line.treatment,
        net: fromCents(line.net),
        tax: fromCents(line.tax),
    })),
    withholding: entry.secret.withholding
        ? {
              percent: entry.secret.withholding.percent,
              amount: fromCents(entry.secret.withholding.amount),
          }
        : null,
    totals: {
        net: fromCents(entry.totals.net),
        tax: fromCents(entry.totals.tax),
        total: fromCents(entry.totals.total),
        withholding: fromCents(entry.totals.withholding),
        payable: fromCents(entry.totals.payable),
    },
    attachment: entry.secret.attachment,
    editable: editModeOf(entry),
    authorName: entry.authorName,
    createdAt: entry.createdAt.toISOString(),
    voidedAt: entry.voidedAt?.toISOString() ?? null,
});
