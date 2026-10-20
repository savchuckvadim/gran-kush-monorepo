import { BadRequestException, Injectable } from "@nestjs/common";

import { type FinanceAccount, LedgerDirection } from "@prisma/client";

import { employeeActor } from "@modules/events";

import { LEDGER_ERRORS, LEDGER_SOURCES, type LedgerEntry } from "../../domain/ledger/ledger-entry";
import { FinanceCategoryRepository } from "../../domain/repositories/finance-category-repository.interface";
import {
    type LedgerEntryChange,
    LedgerRepository,
} from "../../domain/repositories/ledger-repository.interface";
import { entryUpdatedEvent } from "../events/ledger-events";
import { rethrowClosedPeriod } from "../ledger-errors";
import { assertLive } from "../ledger-guards";
import { LedgerEntriesService, type LedgerEntryView } from "../services/ledger-entries.service";

export interface EntryClassification {
    categoryId?: string;
    account?: FinanceAccount;
    notes?: string | null;
}

const fail = (code: string, message: string): never => {
    throw new BadRequestException({ message, code });
};

/**
 * Разметка проводки без сумм: статья, счёт, заметки.
 * - у проводки заказа и поставки меняются статья, счёт и заметки (заплатили картой, а не наличными);
 * - у сторно — только заметки: статья и счёт повторяют отменённую проводку;
 * - статья — своего направления и не в архиве; у перевода статьи нет;
 * - отменённую и сторнированную не трогают; месяц закрыт — 409 `period_closed`.
 */
@Injectable()
export class ReclassifyEntryUseCase {
    constructor(
        private readonly categories: FinanceCategoryRepository,
        private readonly ledger: LedgerRepository,
        private readonly entries: LedgerEntriesService
    ) {}

    async execute(
        portalId: string,
        employeeId: string,
        id: string,
        change: EntryClassification
    ): Promise<LedgerEntryView> {
        const entry = await this.entries.findOrFail(portalId, id);
        assertLive(entry);
        const update: LedgerEntryChange = {};
        if (entry.sourceType === LEDGER_SOURCES.reversal && (change.categoryId || change.account)) {
            fail(
                LEDGER_ERRORS.systemEntry,
                "A reversal keeps the category and account of its entry"
            );
        }
        if (change.categoryId && change.categoryId !== entry.categoryId) {
            update.categoryId = await this.category(portalId, entry, change.categoryId);
        }
        if (change.account) {
            if (
                entry.direction === LedgerDirection.transfer &&
                change.account === entry.toAccount
            ) {
                fail(LEDGER_ERRORS.transferAccounts, "A transfer moves money between two accounts");
            }
            update.account = change.account;
        }
        if (change.notes !== undefined) {
            update.secret = { ...entry.secret, notes: change.notes?.trim() || null };
        }
        await this.ledger
            .update(portalId, id, update, [
                entryUpdatedEvent(portalId, id, entry.occurredOn, employeeActor(employeeId)),
            ])
            .catch(rethrowClosedPeriod);
        return this.entries.get(portalId, id);
    }

    private async category(portalId: string, entry: LedgerEntry, id: string): Promise<string> {
        if (entry.direction === LedgerDirection.transfer) {
            fail(LEDGER_ERRORS.transferCategory, "A transfer has no category");
        }
        const category = await this.categories.findById(portalId, id);
        if (!category) return fail(LEDGER_ERRORS.categoryRequired, "Category not found");
        if (category.direction !== entry.direction) {
            fail(LEDGER_ERRORS.categoryDirection, "The category belongs to the other direction");
        }
        if (category.archivedAt) fail(LEDGER_ERRORS.categoryArchived, "The category is archived");
        return category.id;
    }
}
