import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { employeeActor, type NewDomainEvent } from "@modules/events";
import { InsufficientStockError } from "@modules/portal/crm/orders/domain/errors/insufficient-stock.error";

import {
    type ManualMoveReason,
    roundQuantity,
    STOCK_ERRORS,
    type StockMove,
} from "../../domain/stock-move";
import {
    type PurchaseView,
    type StockMoveFilter,
    StockRepository,
    type StockState,
} from "../../domain/stock-repository.interface";

export interface ManualMoveInput {
    productId: string;
    reason: ManualMoveReason;
    /** Сколько списать (плюс — пересчёт в большую сторону) */
    quantity: number;
    note: string;
}

const fail = (code: string, message: string): never => {
    throw new BadRequestException({ message, code });
};

/** Событие склада для витрины и CRM: остаток товара изменился. */
export const stockChangedEvent = (
    portalId: string,
    move: StockMove,
    employeeId: string | null
): NewDomainEvent => ({
    name: "product.stock_changed",
    portalId,
    actor: employeeId ? employeeActor(employeeId) : { kind: "system", id: null },
    aggregateId: move.productId,
    payload: {
        productId: move.productId,
        reason: move.reason === "initial" ? "manual" : move.reason,
        orderId: move.orderId,
    },
});

/**
 * Склад: остатки, средняя себестоимость, журнал движений. Ручная правка остатка — только
 * движением с причиной (списание, пересчёт, подарок): остаток никогда не «переписывается».
 */
@Injectable()
export class StockService {
    constructor(private readonly repository: StockRepository) {}

    async stateOf(portalId: string, productId: string): Promise<StockState> {
        const state = await this.repository.stateOf(portalId, productId);
        if (!state)
            throw new NotFoundException({
                message: "Product not found",
                code: STOCK_ERRORS.productNotFound,
            });
        return state;
    }

    /** Себестоимость единиц товаров на момент заказа; без поставок — `null`. */
    async unitCosts(
        portalId: string,
        productIds: readonly string[]
    ): Promise<Map<string, number | null>> {
        const states = await this.repository.statesOf(portalId, productIds);
        return new Map(states.map((state) => [state.productId, state.averageCost]));
    }

    moves(portalId: string, filter: StockMoveFilter, page: { skip: number; take: number }) {
        return this.repository.moves(portalId, filter, page);
    }

    purchases(
        portalId: string,
        filter: { productId?: string; from?: string; to?: string },
        page: { skip: number; take: number }
    ): Promise<{ items: PurchaseView[]; total: number }> {
        return this.repository.purchases(portalId, filter, page);
    }

    /** Списание, пересчёт или подарок: расход по средней себестоимости, причина обязательна. */
    async moveManually(
        portalId: string,
        employeeId: string,
        input: ManualMoveInput
    ): Promise<StockMove> {
        const quantity = roundQuantity(input.quantity);
        if (quantity === 0) fail(STOCK_ERRORS.quantityPositive, "Quantity must not be zero");
        if (input.reason !== "recount" && quantity < 0) {
            fail(STOCK_ERRORS.quantityPositive, "Write-off and gift quantities are positive");
        }
        const note = input.note.trim();
        if (!note) fail(STOCK_ERRORS.noteRequired, "Explain the stock change");
        await this.stateOf(portalId, input.productId);
        try {
            return await this.repository.moveManually(
                portalId,
                {
                    productId: input.productId,
                    reason: input.reason,
                    quantity: input.reason === "recount" ? quantity : -quantity,
                    unitCost: null,
                    note,
                    employeeId,
                },
                (move) => [stockChangedEvent(portalId, move, employeeId)]
            );
        } catch (error) {
            if (error instanceof InsufficientStockError) {
                fail(STOCK_ERRORS.insufficient, "Not enough stock to write off");
            }
            throw error;
        }
    }
}
