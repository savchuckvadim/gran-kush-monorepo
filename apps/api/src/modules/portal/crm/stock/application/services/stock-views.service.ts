import { Injectable } from "@nestjs/common";

import { CounterpartiesService } from "@modules/portal/crm/finance/application/services/counterparties.service";
import { FinanceDirectory } from "@modules/portal/crm/finance/domain/repositories/finance-sources.interface";

import type { PurchaseDto, StockMoveDto, StockStateDto } from "../../api/dto/stock.dto";
import type { StockMove } from "../../domain/stock-move";
import type { PurchaseView, StockState } from "../../domain/stock-repository.interface";

const CENTS = 100;

/** Движения и поставки для экрана: имена сотрудников и контрагентов подставлены. */
@Injectable()
export class StockViewsService {
    constructor(
        private readonly directory: FinanceDirectory,
        private readonly counterparties: CounterpartiesService
    ) {}

    state(state: StockState): StockStateDto {
        return {
            productId: state.productId,
            currentQuantity: state.currentQuantity,
            averageCost: state.averageCost,
            stockValue:
                state.averageCost === null
                    ? null
                    : Math.round(state.currentQuantity * state.averageCost * CENTS) / CENTS,
        };
    }

    async moves(portalId: string, moves: readonly StockMove[]): Promise<StockMoveDto[]> {
        const names = await this.directory.employeeNames(
            portalId,
            moves.flatMap((move) => (move.employeeId ? [move.employeeId] : []))
        );
        return moves.map((move) => ({
            id: move.id,
            productId: move.productId,
            productName: move.productName,
            reason: move.reason,
            quantity: move.quantity,
            unitCost: move.unitCost,
            balanceAfter: move.balanceAfter,
            orderId: move.orderId,
            purchaseId: move.purchaseId,
            note: move.note,
            employeeName: move.employeeId ? (names.get(move.employeeId) ?? null) : null,
            occurredAt: move.occurredAt.toISOString(),
        }));
    }

    async purchases(portalId: string, purchases: readonly PurchaseView[]): Promise<PurchaseDto[]> {
        const [names, parties] = await Promise.all([
            this.directory.employeeNames(
                portalId,
                purchases.flatMap((p) => (p.employeeId ? [p.employeeId] : []))
            ),
            this.counterparties.namesOf(
                portalId,
                purchases.flatMap((p) => (p.counterpartyId ? [p.counterpartyId] : []))
            ),
        ]);
        return purchases.map((purchase) => ({
            id: purchase.id,
            productId: purchase.productId,
            productName: purchase.productName,
            quantity: purchase.quantity,
            unitCost: purchase.unitCost,
            total: purchase.total,
            counterpartyId: purchase.counterpartyId,
            counterpartyName: purchase.counterpartyId
                ? (parties.get(purchase.counterpartyId)?.name ?? null)
                : null,
            ledgerEntryId: purchase.ledgerEntryId,
            receivedOn: purchase.receivedOn,
            employeeName: purchase.employeeId ? (names.get(purchase.employeeId) ?? null) : null,
        }));
    }
}
