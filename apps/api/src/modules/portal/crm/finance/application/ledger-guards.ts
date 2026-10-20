import { ConflictException } from "@nestjs/common";

import { LedgerEntryStatus } from "@prisma/client";

import {
    isSystemEntry,
    LEDGER_ERRORS,
    type LedgerEntry,
    type LedgerSecret,
} from "../domain/ledger/ledger-entry";
import type { LedgerRepository } from "../domain/repositories/ledger-repository.interface";

const conflict = (code: string, message: string) => new ConflictException({ message, code });

/** Отменённую и сторнированную проводку не меняют: история остаётся как была. */
export const assertLive = (entry: LedgerEntry): void => {
    if (entry.status === LedgerEntryStatus.void) {
        throw conflict(LEDGER_ERRORS.alreadyVoid, "The entry is voided");
    }
    if (entry.reversedById) throw conflict(LEDGER_ERRORS.alreadyReversed, "The entry is reversed");
};

/** Суммы проводки заказа ведёт заказ, сторно — отменённая проводка. */
export const assertManual = (entry: LedgerEntry): void => {
    if (isSystemEntry(entry)) {
        throw conflict(LEDGER_ERRORS.systemEntry, "The entry follows its order or reversed entry");
    }
};

/**
 * Тот же контрагент и номер документа уже проведены — 409 `duplicate_document` с id найденной
 * проводки: CRM спросит, не дубль ли это, и повторит с `allowDuplicate`.
 */
export const assertNotDuplicate = async (
    ledger: LedgerRepository,
    portalId: string,
    entry: { counterpartyId: string | null; secret: LedgerSecret },
    exceptId: string | null,
    allowDuplicate: boolean
): Promise<void> => {
    const number = entry.secret.documentNumber;
    if (allowDuplicate || !entry.counterpartyId || !number) return;
    const existing = await ledger.findDocument(portalId, entry.counterpartyId, number, exceptId);
    if (existing) {
        throw new ConflictException({
            message: "This counterparty already has an entry with this document number",
            code: LEDGER_ERRORS.duplicateDocument,
            entryId: existing,
        });
    }
};
