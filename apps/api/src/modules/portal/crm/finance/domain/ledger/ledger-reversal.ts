import type { NewLedgerEntry } from "../repositories/ledger-repository.interface";

import { LEDGER_SOURCES, type LedgerEntry, reversedSecret } from "./ledger-entry";

/**
 * Сторно проводки: та же статья, счёт и контрагент, суммы с обратным знаком, дата — в открытом
 * месяце. Источник — отменённая проводка: второе сторно той же проводки база не примет.
 */
export const reversalEntry = (
    original: LedgerEntry,
    id: string,
    occurredOn: string,
    createdById: string | null
): NewLedgerEntry => ({
    id,
    direction: original.direction,
    occurredOn,
    categoryId: original.categoryId,
    counterpartyId: original.counterpartyId,
    account: original.account,
    toAccount: original.toAccount,
    currency: original.currency,
    documentType: original.documentType,
    secret: reversedSecret(original.secret),
    sourceType: LEDGER_SOURCES.reversal,
    sourceId: original.id,
    reversalOfId: original.id,
    createdById,
});
