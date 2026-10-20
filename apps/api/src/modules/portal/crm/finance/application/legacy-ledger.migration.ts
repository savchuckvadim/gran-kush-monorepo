import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";

import { FinanceAccount, LedgerDirection, LedgerDocumentType } from "@prisma/client";
import { randomUUID } from "crypto";

import { ORDER_SALE_CATEGORY } from "../domain/ledger/finance-category";
import { localDate } from "../domain/ledger/finance-period";
import { LEDGER_SOURCES } from "../domain/ledger/ledger-entry";
import { toCents } from "../domain/ledger/ledger-money";
import {
    FinanceDirectory,
    type LegacyTransaction,
    LegacyTransactionSource,
} from "../domain/repositories/finance-sources.interface";
import {
    LedgerRepository,
    type NewLedgerEntry,
} from "../domain/repositories/ledger-repository.interface";

import { FinanceCategoriesService } from "./services/finance-categories.service";

/** Способы оплаты старых проводок; остальные (crypto) — касса с пометкой в заметках. */
const LEGACY_ACCOUNTS: Readonly<Record<string, FinanceAccount>> = {
    cash: FinanceAccount.cash,
    card: FinanceAccount.card,
    bank: FinanceAccount.bank,
    transfer: FinanceAccount.bank,
    bank_transfer: FinanceAccount.bank,
};

const LEGACY_ORDER_PAYMENT = "order_payment";

const categoryCodeOf = (row: LegacyTransaction): string => {
    if (row.direction !== LedgerDirection.income) return "other_expenses";
    return row.type === LEGACY_ORDER_PAYMENT ? ORDER_SALE_CATEGORY : "other_income";
};

/**
 * Перенос проводок старой таблицы `financial_transactions` в реестр (TASK-798): сумма шифруется
 * ключом портала, источник — `legacy` с id старой строки, поэтому повторный старт ничего не
 * дублирует. Временный: удаляется вместе с таблицей в TASK-799, когда перенос пройдёт на проде.
 */
@Injectable()
export class LegacyLedgerMigration implements OnApplicationBootstrap {
    private readonly logger = new Logger(LegacyLedgerMigration.name);

    constructor(
        private readonly legacy: LegacyTransactionSource,
        private readonly ledger: LedgerRepository,
        private readonly categories: FinanceCategoriesService,
        private readonly directory: FinanceDirectory
    ) {}

    async onApplicationBootstrap(): Promise<void> {
        try {
            const moved = await this.migrate();
            if (moved > 0) this.logger.log(`Moved ${moved} legacy transactions into the ledger`);
        } catch (error) {
            this.logger.error(`Legacy ledger migration failed: ${String(error)}`);
        }
    }

    async migrate(): Promise<number> {
        const rows = await this.legacy.pending();
        const byPortal = new Map<string, LegacyTransaction[]>();
        for (const row of rows)
            byPortal.set(row.portalId, [...(byPortal.get(row.portalId) ?? []), row]);
        let total = 0;
        for (const [portalId, portalRows] of byPortal) {
            total += await this.migratePortal(portalId, portalRows);
        }
        return total;
    }

    private async migratePortal(portalId: string, rows: LegacyTransaction[]): Promise<number> {
        await this.categories.seedPresets(portalId);
        const categories = new Map(
            (await this.categories.list(portalId, true)).map((category) => [
                category.code,
                category.id,
            ])
        );
        const timeZone = await this.directory.timeZone(portalId);
        const entries = rows.map((row) => this.entryOf(row, categories, timeZone));
        return this.ledger.create(portalId, entries, () => []);
    }

    private entryOf(
        row: LegacyTransaction,
        categories: ReadonlyMap<string, string>,
        timeZone: string
    ): NewLedgerEntry {
        const method = row.paymentMethod ?? "cash";
        const account = LEGACY_ACCOUNTS[method] ?? FinanceAccount.cash;
        const methodNote = LEGACY_ACCOUNTS[method] ? null : `Pago: ${method}`;
        const notes = [row.notes, methodNote].filter(Boolean).join("\n") || null;
        const income = row.direction === LedgerDirection.income;
        return {
            id: randomUUID(),
            direction: income ? LedgerDirection.income : LedgerDirection.expense,
            occurredOn: localDate(row.transactionDate, timeZone),
            categoryId: categories.get(categoryCodeOf(row)) ?? null,
            counterpartyId: null,
            account,
            toAccount: null,
            currency: row.currency,
            documentType: LedgerDocumentType.none,
            secret: {
                lines: [{ percent: 0, treatment: null, net: toCents(row.amount), tax: 0 }],
                withholding: null,
                description: row.description,
                notes,
                documentNumber: null,
                documentDate: null,
                paidOn: null,
                sourceLabel: null,
                attachment: null,
            },
            sourceType: LEDGER_SOURCES.legacy,
            sourceId: row.id,
            reversalOfId: null,
            createdById: row.createdBy,
        };
    }
}
