import { Injectable } from "@nestjs/common";

import { LedgerDirection, LedgerDocumentType, TaxTreatment } from "@prisma/client";
import { randomUUID } from "crypto";

import { employeeActor, type OutboxTransaction } from "@modules/events";
import { PortalModulesService } from "@modules/portal/crm/portal-modules/application/portal-modules.service";

import { LEDGER_SOURCES } from "../../domain/ledger/ledger-entry";
import { lineFromAmount, toCents } from "../../domain/ledger/ledger-money";
import { defaultEntryRate } from "../../domain/ledger/ledger-tax";
import { LedgerRepository } from "../../domain/repositories/ledger-repository.interface";
import { LEDGER_CURRENCY } from "../../finance.limits";
import { entryRecordedEvent } from "../events/ledger-events";
import { rethrowClosedPeriod } from "../ledger-errors";

import { FinanceCategoriesService } from "./finance-categories.service";
import { TaxRatesService } from "./tax-rates.service";

/** Статья, в которую идут поставки товара: «Compras de mercaderías», PGC 600. */
const PURCHASES_CATEGORY = "purchases";

export interface PurchaseExpense {
    purchaseId: string;
    productName: string;
    quantity: number;
    /** База без налога, евро */
    netAmount: number;
    counterpartyId: string | null;
    receivedOn: string;
    employeeId: string;
}

/**
 * Расход на закупку товара для склада (TASK-804): проводка по статье закупок внутри транзакции
 * поставки, налог — по общей ставке поставщика, источник — поставка. Без модуля финансов проводки
 * нет: склад считает себестоимость сам.
 */
@Injectable()
export class PurchaseLedgerService {
    constructor(
        private readonly modules: PortalModulesService,
        private readonly categories: FinanceCategoriesService,
        private readonly taxRates: TaxRatesService,
        private readonly ledger: LedgerRepository
    ) {}

    /** Id проводки или `null`, если финансы у клуба выключены. */
    async recordIn(
        tx: OutboxTransaction,
        portalId: string,
        expense: PurchaseExpense
    ): Promise<string | null> {
        if (!(await this.modules.isEnabled(portalId, "finance"))) return null;
        const category = await this.categories.findByCode(portalId, PURCHASES_CATEGORY);
        const rate = defaultEntryRate(
            "expense",
            category,
            await this.taxRates.list(portalId, true)
        );
        const line = lineFromAmount(toCents(expense.netAmount), {
            percent: rate?.percent ?? 0,
            treatment: rate?.treatment ?? TaxTreatment.not_subject,
            includesTax: false,
        });
        const id = randomUUID();
        const entry = {
            id,
            direction: LedgerDirection.expense,
            occurredOn: expense.receivedOn,
            categoryId: category?.id ?? null,
            counterpartyId: expense.counterpartyId,
            account: "bank" as const,
            toAccount: null,
            currency: LEDGER_CURRENCY,
            documentType: LedgerDocumentType.none,
            secret: {
                lines: [line],
                withholding: null,
                description: `${expense.productName} × ${expense.quantity}`,
                notes: null,
                documentNumber: null,
                documentDate: null,
                paidOn: null,
                sourceLabel: null,
                attachment: null,
            },
            sourceType: LEDGER_SOURCES.purchase,
            sourceId: expense.purchaseId,
            reversalOfId: null,
            createdById: expense.employeeId,
        };
        await this.ledger
            .createIn(tx, portalId, entry, [
                entryRecordedEvent(portalId, entry, employeeActor(expense.employeeId)),
            ])
            .catch(rethrowClosedPeriod);
        return id;
    }
}
