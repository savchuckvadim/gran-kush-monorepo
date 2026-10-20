import { LedgerDocumentType } from "@prisma/client";

import type { EntryInput } from "../../application/services/ledger-entry-input.service";
import type { LedgerEntryInputDto } from "../dto/ledger-entry-input.dto";

/** Необязательные поля формы → значения по умолчанию сценария: сумма с налогом, без удержания. */
export const toEntryInput = (dto: LedgerEntryInputDto): EntryInput => ({
    direction: dto.direction,
    occurredOn: dto.occurredOn,
    categoryId: dto.categoryId ?? null,
    account: dto.account,
    toAccount: dto.toAccount ?? null,
    amount: dto.amount,
    amountIncludesTax: dto.amountIncludesTax ?? true,
    taxRateId: dto.taxRateId ?? null,
    withholdingPercent: dto.withholdingPercent ?? 0,
    description: dto.description,
    notes: dto.notes ?? null,
    counterpartyId: dto.counterpartyId ?? null,
    memberId: dto.memberId ?? null,
    documentType: dto.documentType ?? LedgerDocumentType.none,
    documentNumber: dto.documentNumber ?? null,
    documentDate: dto.documentDate ?? null,
    paidOn: dto.paidOn ?? null,
});
