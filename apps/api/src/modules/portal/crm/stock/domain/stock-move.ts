import type { StockMoveReason } from "@prisma/client";

/** Движение склада: приход со знаком плюс, расход — минус; суммы в евро, количество в единицах. */
export interface StockMove {
    id: string;
    productId: string;
    productName: string;
    reason: StockMoveReason;
    quantity: number;
    unitCost: number;
    balanceAfter: number;
    orderId: string | null;
    purchaseId: string | null;
    note: string | null;
    employeeId: string | null;
    occurredAt: Date;
}

/** Причины ручного движения: списание брака, пересчёт после инвентаризации, подарок. */
export const MANUAL_MOVE_REASONS = ["write_off", "recount", "gift"] as const;
export type ManualMoveReason = (typeof MANUAL_MOVE_REASONS)[number];

/** Точность себестоимости единицы — четыре знака: 0,0833 € за грамм не должно округлиться в 0,08. */
const COST_SCALE = 10_000;
const QUANTITY_SCALE = 1_000;

export const roundCost = (value: number): number => Math.round(value * COST_SCALE) / COST_SCALE;

export const roundQuantity = (value: number): number =>
    Math.round(value * QUANTITY_SCALE) / QUANTITY_SCALE;

/**
 * Средневзвешенная себестоимость после прихода: (остаток × старая + приход × цена) / новый остаток.
 * Отрицательный или нулевой остаток до прихода не тянет старую цену: новая партия задаёт цену.
 */
export const averageCostAfterPurchase = (
    balance: number,
    currentCost: number | null,
    quantity: number,
    unitCost: number
): number => {
    if (balance <= 0 || currentCost === null) return roundCost(unitCost);
    return roundCost((balance * currentCost + quantity * unitCost) / (balance + quantity));
};

export const STOCK_ERRORS = {
    quantityPositive: "stock_quantity_positive",
    insufficient: "stock_insufficient",
    productNotFound: "stock_product_not_found",
    noteRequired: "stock_note_required",
} as const;
