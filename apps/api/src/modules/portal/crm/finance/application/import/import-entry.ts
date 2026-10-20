import { LedgerDirection, LedgerDocumentType } from "@prisma/client";
import { randomUUID } from "crypto";

import { LEDGER_SOURCES } from "../../domain/ledger/ledger-entry";
import type { NewLedgerEntry } from "../../domain/repositories/ledger-repository.interface";
import { LEDGER_CURRENCY } from "../../finance.limits";

import type { PlannedRow } from "./import-report";

/** Строка файла → проводка: источник — хеш файла и номер строки, документ — по наличию номера. */
export const importEntryOf = (row: PlannedRow, employeeId: string): NewLedgerEntry => {
    const draft = row.draft;
    if (!draft) throw new Error("Import row has no draft");
    const income = draft.direction === "income";
    const documentType = !draft.documentNumber
        ? LedgerDocumentType.none
        : income
          ? LedgerDocumentType.invoice_issued
          : LedgerDocumentType.invoice_received;
    return {
        id: randomUUID(),
        direction: income ? LedgerDirection.income : LedgerDirection.expense,
        occurredOn: draft.occurredOn,
        categoryId: draft.category.id,
        counterpartyId: row.counterpartyId,
        account: draft.account,
        toAccount: null,
        currency: LEDGER_CURRENCY,
        documentType,
        secret: {
            lines: [draft.line],
            withholding: draft.withholding,
            description: draft.description,
            notes: draft.notes,
            documentNumber: draft.documentNumber,
            documentDate: null,
            paidOn: draft.paidOn,
            sourceLabel: null,
            attachment: null,
        },
        sourceType: LEDGER_SOURCES.import,
        sourceId: row.sourceId,
        reversalOfId: null,
        createdById: employeeId,
    };
};
