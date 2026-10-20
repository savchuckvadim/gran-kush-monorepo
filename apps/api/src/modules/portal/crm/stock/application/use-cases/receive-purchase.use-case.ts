import { BadRequestException, Injectable } from "@nestjs/common";

import { randomUUID } from "crypto";

import { PurchaseLedgerService } from "@modules/portal/crm/finance/application/services/purchase-ledger.service";

import { roundCost, roundQuantity, STOCK_ERRORS, type StockMove } from "../../domain/stock-move";
import { StockRepository } from "../../domain/stock-repository.interface";
import { stockChangedEvent, StockService } from "../services/stock.service";

export interface PurchaseInput {
    productId: string;
    quantity: number;
    /** Цена закупки единицы без налога, евро */
    unitCost: number;
    counterpartyId: string | null;
    receivedOn: string;
}

/**
 * Поставка товара (TASK-804): приход на склад, новая средняя себестоимость и расход в учёте —
 * одной транзакцией.
 * - количество и цена больше нуля; контрагент не обязателен (краски с маркетплейса);
 * - себестоимость — средневзвешенная: (остаток × старая + приход × цена) / новый остаток;
 * - при включённых финансах — проводка расхода по статье «Закупки товара» с налогом по общей
 *   ставке поставщика, источник — поставка; месяц закрыт — 409 `period_closed`, ничего не записано;
 * - без модуля финансов — только склад.
 */
@Injectable()
export class ReceivePurchaseUseCase {
    constructor(
        private readonly stock: StockService,
        private readonly repository: StockRepository,
        private readonly purchaseLedger: PurchaseLedgerService
    ) {}

    async execute(
        portalId: string,
        employeeId: string,
        input: PurchaseInput
    ): Promise<{ purchaseId: string; move: StockMove; ledgerEntryId: string | null }> {
        const quantity = roundQuantity(input.quantity);
        const unitCost = roundCost(input.unitCost);
        if (quantity <= 0 || unitCost < 0) {
            throw new BadRequestException({
                message: "Quantity must be positive and the unit cost not negative",
                code: STOCK_ERRORS.quantityPositive,
            });
        }
        const product = await this.stock.stateOf(portalId, input.productId);
        const purchaseId = randomUUID();
        let ledgerEntryId: string | null = null;
        const { move } = await this.repository.purchase(
            portalId,
            {
                id: purchaseId,
                productId: input.productId,
                quantity,
                unitCost,
                counterpartyId: input.counterpartyId,
                receivedOn: input.receivedOn,
                employeeId,
            },
            async (tx) => {
                ledgerEntryId = await this.purchaseLedger.recordIn(tx, portalId, {
                    purchaseId,
                    productName: product.name,
                    quantity,
                    netAmount: Math.round(quantity * unitCost * 100) / 100,
                    counterpartyId: input.counterpartyId,
                    receivedOn: input.receivedOn,
                    employeeId,
                });
                return ledgerEntryId;
            },
            (received) => [stockChangedEvent(portalId, received, employeeId)]
        );
        return { purchaseId, move, ledgerEntryId };
    }
}
