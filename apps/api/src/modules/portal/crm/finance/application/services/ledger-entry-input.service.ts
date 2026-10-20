import { BadRequestException, Injectable } from "@nestjs/common";

import {
    type FinanceAccount,
    LedgerDirection,
    LedgerDocumentType,
    TaxTreatment,
} from "@prisma/client";

import type { FinanceCategory } from "../../domain/ledger/finance-category";
import {
    LEDGER_ERRORS,
    type LedgerLine,
    type LedgerSecret,
} from "../../domain/ledger/ledger-entry";
import { lineFromAmount, toCents, withholdingOf } from "../../domain/ledger/ledger-money";
import { defaultEntryRate } from "../../domain/ledger/ledger-tax";
import { FinanceCategoryRepository } from "../../domain/repositories/finance-category-repository.interface";
import type { NewLedgerEntry } from "../../domain/repositories/ledger-repository.interface";

import { CounterpartiesService } from "./counterparties.service";
import { TaxRatesService } from "./tax-rates.service";

/** Проводка, как её вводит человек: сумма в евро, ставка клуба, контрагент или участник. */
export interface EntryInput {
    direction: LedgerDirection;
    occurredOn: string;
    categoryId: string | null;
    account: FinanceAccount;
    toAccount: FinanceAccount | null;
    amount: number;
    /** Сумма с налогом (чек) или база (фактура без IVA) */
    amountIncludesTax: boolean;
    taxRateId: string | null;
    withholdingPercent: number;
    description: string;
    notes: string | null;
    counterpartyId: string | null;
    memberId: string | null;
    documentType: LedgerDocumentType;
    documentNumber: string | null;
    documentDate: string | null;
    paidOn: string | null;
}

export type ResolvedEntry = Omit<
    NewLedgerEntry,
    "id" | "currency" | "sourceType" | "sourceId" | "reversalOfId" | "createdById"
>;

/** Ставки нет совсем (финансы без пресета) — операция без налога, а не отказ. */
const NO_TAX = { percent: 0, treatment: TaxTreatment.not_subject };

const fail = (code: string, message: string): never => {
    throw new BadRequestException({ message, code });
};

/**
 * Ввод проводки → поля проводки: проверяет статью, ставку и контрагента клуба, считает строку
 * налога и удержание. Общий для записи и правки.
 */
@Injectable()
export class LedgerEntryInputService {
    constructor(
        private readonly categories: FinanceCategoryRepository,
        private readonly counterparties: CounterpartiesService,
        private readonly taxRates: TaxRatesService
    ) {}

    /** `keepCategoryId` — статья, уже стоящая на проводке: её можно оставить и в архиве. */
    async resolve(
        portalId: string,
        input: EntryInput,
        keepCategoryId: string | null = null
    ): Promise<ResolvedEntry> {
        if (input.direction === LedgerDirection.transfer) return this.transfer(input);
        const category = await this.category(portalId, input, keepCategoryId);
        const rate = await this.rate(portalId, input, category);
        const line = lineFromAmount(toCents(input.amount), {
            ...rate,
            includesTax: input.amountIncludesTax,
        });
        const counterpartyId = await this.counterparties.resolveForEntry(portalId, input);
        return {
            direction: input.direction,
            occurredOn: input.occurredOn,
            categoryId: category.id,
            counterpartyId,
            account: input.account,
            toAccount: null,
            documentType: input.documentType,
            secret: this.secret(input, [line], withholdingOf(line.net, input.withholdingPercent)),
        };
    }

    private transfer(input: EntryInput): ResolvedEntry {
        if (input.categoryId) fail(LEDGER_ERRORS.transferCategory, "A transfer has no category");
        if (!input.toAccount || input.toAccount === input.account) {
            fail(LEDGER_ERRORS.transferAccounts, "A transfer moves money between two accounts");
        }
        const line: LedgerLine = {
            percent: 0,
            treatment: null,
            net: toCents(input.amount),
            tax: 0,
        };
        return {
            direction: LedgerDirection.transfer,
            occurredOn: input.occurredOn,
            categoryId: null,
            counterpartyId: null,
            account: input.account,
            toAccount: input.toAccount,
            documentType: LedgerDocumentType.none,
            secret: this.secret(
                { ...input, documentNumber: null, documentDate: null },
                [line],
                null
            ),
        };
    }

    private async category(
        portalId: string,
        input: EntryInput,
        keepCategoryId: string | null
    ): Promise<FinanceCategory> {
        const category = input.categoryId
            ? await this.categories.findById(portalId, input.categoryId)
            : null;
        if (!category) return fail(LEDGER_ERRORS.categoryRequired, "Choose a category");
        if (category.direction !== input.direction) {
            fail(LEDGER_ERRORS.categoryDirection, "The category belongs to the other direction");
        }
        if (category.archivedAt && category.id !== keepCategoryId) {
            fail(LEDGER_ERRORS.categoryArchived, "The category is archived");
        }
        return category;
    }

    private async rate(
        portalId: string,
        input: EntryInput,
        category: FinanceCategory
    ): Promise<{ percent: number; treatment: TaxTreatment }> {
        const rates = await this.taxRates.list(portalId, true);
        if (input.taxRateId) {
            const chosen = rates.find((rate) => rate.id === input.taxRateId && !rate.archivedAt);
            return chosen ?? fail(LEDGER_ERRORS.taxRateNotFound, "Tax rate not found");
        }
        const direction = input.direction === LedgerDirection.income ? "income" : "expense";
        return defaultEntryRate(direction, category, rates) ?? NO_TAX;
    }

    private secret(
        input: EntryInput,
        lines: LedgerLine[],
        withholding: LedgerSecret["withholding"]
    ): LedgerSecret {
        return {
            lines,
            withholding,
            description: input.description.trim(),
            notes: input.notes?.trim() || null,
            documentNumber: input.documentNumber?.trim() || null,
            documentDate: input.documentDate,
            paidOn: input.paidOn,
            sourceLabel: null,
            attachment: null,
        };
    }
}
