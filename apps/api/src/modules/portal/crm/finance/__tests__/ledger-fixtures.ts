import {
    FinanceAccount,
    LedgerDirection,
    LedgerDocumentType,
    LedgerEntryStatus,
    TaxTreatment,
} from "@prisma/client";

import { LEDGER_SOURCES, type LedgerEntry, type LedgerSecret } from "../domain/ledger/ledger-entry";

const SECRET: LedgerSecret = {
    lines: [{ percent: 21, treatment: TaxTreatment.taxable, net: 10000, tax: 2100 }],
    withholding: null,
    description: "Alquiler",
    notes: null,
    documentNumber: null,
    documentDate: null,
    paidOn: null,
    sourceLabel: null,
    attachment: null,
};

/** Проводка для тестов домена: расход 100 € + 21 % из кассы, если не сказано иное. */
export const ledgerEntry = (
    patch: Partial<Omit<LedgerEntry, "secret">> & { secret?: Partial<LedgerSecret> } = {}
): LedgerEntry => {
    const { secret, ...rest } = patch;
    return {
        id: "entry-1",
        direction: LedgerDirection.expense,
        status: LedgerEntryStatus.posted,
        occurredOn: "2026-10-05",
        categoryId: "rent",
        counterpartyId: null,
        account: FinanceAccount.cash,
        toAccount: null,
        currency: "EUR",
        documentType: LedgerDocumentType.none,
        sourceType: LEDGER_SOURCES.manual,
        sourceId: null,
        reversalOfId: null,
        reversedById: null,
        hasAttachment: false,
        createdById: null,
        createdAt: new Date("2026-10-05T10:00:00Z"),
        updatedAt: new Date("2026-10-05T10:00:00Z"),
        voidedAt: null,
        ...rest,
        secret: { ...SECRET, ...secret },
    };
};
