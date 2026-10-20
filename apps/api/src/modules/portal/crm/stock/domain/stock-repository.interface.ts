import type { StockMoveReason } from "@prisma/client";

import type { NewDomainEvent, OutboxTransaction } from "@modules/events";

import type { StockMove } from "./stock-move";

export interface StockMoveInput {
    productId: string;
    reason: StockMoveReason;
    /** Приход — плюс, расход — минус */
    quantity: number;
    /** Себестоимость единицы; `null` — средняя товара на этот момент */
    unitCost: number | null;
    orderId?: string | null;
    purchaseId?: string | null;
    note?: string | null;
    employeeId?: string | null;
}

/** Товар глазами склада: остаток и средняя себестоимость. */
export interface StockState {
    productId: string;
    name: string;
    currentQuantity: number;
    averageCost: number | null;
    isAvailable: boolean;
}

export interface NewPurchase {
    id: string;
    productId: string;
    quantity: number;
    unitCost: number;
    counterpartyId: string | null;
    receivedOn: string;
    employeeId: string;
}

export interface StockMoveFilter {
    productId?: string;
    from?: Date;
    to?: Date;
}

/**
 * Журнал движений и остатки. Запись движения меняет остаток товара тем же UPDATE под блокировкой
 * строки, как это делает заказ: остаток не уйдёт в минус между проверкой и записью.
 */
export abstract class StockRepository {
    abstract stateOf(portalId: string, productId: string): Promise<StockState | null>;

    abstract statesOf(portalId: string, productIds: readonly string[]): Promise<StockState[]>;

    abstract moves(
        portalId: string,
        filter: StockMoveFilter,
        page: { skip: number; take: number }
    ): Promise<{ items: StockMove[]; total: number }>;

    /**
     * Движение внутри чужой транзакции (заказ, поставка): остаток, запись журнала. Расход больше
     * остатка — `InsufficientStockError`; `null` в `unitCost` — средняя товара на этот момент.
     */
    abstract move(
        tx: OutboxTransaction,
        portalId: string,
        input: StockMoveInput
    ): Promise<StockMove>;

    /** Ручное движение со своей транзакцией и событиями. */
    abstract moveManually(
        portalId: string,
        input: StockMoveInput,
        events: (move: StockMove) => NewDomainEvent[]
    ): Promise<StockMove>;

    /**
     * Поставка: строка поставки, приход, новая средняя себестоимость и проводка расхода (через
     * `ledger`) — одной транзакцией.
     */
    abstract purchase(
        portalId: string,
        purchase: NewPurchase,
        ledger: (tx: OutboxTransaction) => Promise<string | null>,
        events: (move: StockMove) => NewDomainEvent[]
    ): Promise<{ purchaseId: string; move: StockMove }>;

    /** Поставки клуба за период — для списка и для «что ест маржу». */
    abstract purchases(
        portalId: string,
        filter: { productId?: string; from?: string; to?: string },
        page: { skip: number; take: number }
    ): Promise<{ items: PurchaseView[]; total: number }>;
}

export interface PurchaseView {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitCost: number;
    total: number;
    counterpartyId: string | null;
    ledgerEntryId: string | null;
    receivedOn: string;
    employeeId: string | null;
    createdAt: Date;
}
