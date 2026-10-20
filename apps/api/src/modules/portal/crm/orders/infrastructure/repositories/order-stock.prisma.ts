import { Logger } from "@nestjs/common";

import { Prisma } from "@prisma/client";

import { InsufficientStockError } from "@modules/portal/crm/orders/domain/errors/insufficient-stock.error";
import type { StockLine } from "@modules/portal/crm/orders/domain/repositories/order-repository.interface";

/*
 * Stock moves of an order, always inside the order's own transaction. No "read, check, write":
 * the UPDATE carries the check, so a parallel order waits for the row lock and then sees what is
 * really left (Postgres re-evaluates the WHERE on the fresh row). Every move is journaled in
 * `stock_moves` with the average cost of the product at that moment (TASK-804), so the margin of
 * the order and the inventory book can be rebuilt from the journal.
 */

const logger = new Logger("OrderStock");

interface MergedLine {
    productId: string;
    quantity: Prisma.Decimal;
}

/** Who moved the goods and which order it was for. */
export interface StockMoveContext {
    orderId: string;
    employeeId: string | null;
}

/**
 * One line per product, in product id order. Two orders sharing products then lock the rows in
 * the same order and cannot deadlock each other.
 */
export const mergeStockLines = (lines: readonly StockLine[]): MergedLine[] => {
    const byProduct = new Map<string, Prisma.Decimal>();
    for (const { productId, quantity } of lines) {
        const current = byProduct.get(productId) ?? new Prisma.Decimal(0);
        byProduct.set(productId, current.plus(quantity));
    }
    return [...byProduct.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([productId, quantity]) => ({ productId, quantity }));
};

const journal = async (
    tx: Prisma.TransactionClient,
    portalId: string,
    productId: string,
    quantity: Prisma.Decimal,
    reason: "order_placed" | "order_cancelled",
    context: StockMoveContext
): Promise<Prisma.Decimal | null> => {
    const product = await tx.product.findUniqueOrThrow({
        where: { id: productId },
        select: { currentQuantity: true, averageCost: true },
    });
    await tx.stockMove.create({
        data: {
            portalId,
            productId,
            reason,
            quantity,
            unitCost: product.averageCost ?? new Prisma.Decimal(0),
            balanceAfter: product.currentQuantity,
            orderId: context.orderId,
            employeeId: context.employeeId,
        },
    });
    return product.averageCost;
};

/**
 * Takes the goods off the shelf or throws {@link InsufficientStockError}, rolling the order back.
 * Returns the average unit cost of every product at this moment (`null` — never purchased).
 */
export const reserveStock = async (
    tx: Prisma.TransactionClient,
    portalId: string,
    lines: readonly StockLine[],
    context: StockMoveContext
): Promise<Map<string, Prisma.Decimal | null>> => {
    const costs = new Map<string, Prisma.Decimal | null>();
    for (const { productId, quantity } of mergeStockLines(lines)) {
        const { count } = await tx.product.updateMany({
            where: { id: productId, portalId, currentQuantity: { gte: quantity } },
            data: { currentQuantity: { decrement: quantity } },
        });
        if (count === 0) throw new InsufficientStockError(productId);

        // the row is locked by this transaction until it ends, so this read is our own result
        const product = await tx.product.findUniqueOrThrow({
            where: { id: productId },
            select: { name: true, currentQuantity: true, minQuantity: true },
        });
        if (product.currentQuantity.lessThanOrEqualTo(0)) {
            await tx.product.update({ where: { id: productId }, data: { isAvailable: false } });
        }

        const before = product.currentQuantity.plus(quantity);
        if (
            product.minQuantity &&
            product.currentQuantity.lessThanOrEqualTo(product.minQuantity) &&
            before.greaterThan(product.minQuantity)
        ) {
            logger.warn(
                `Low stock alert: Product "${product.name}" (${productId}) quantity ` +
                    `${product.currentQuantity.toString()} ≤ min ${product.minQuantity.toString()}`
            );
        }
        costs.set(
            productId,
            await journal(tx, portalId, productId, quantity.negated(), "order_placed", context)
        );
    }
    return costs;
};

/** Puts the goods back; a product that had sold out becomes available again. */
export const returnStock = async (
    tx: Prisma.TransactionClient,
    portalId: string,
    lines: readonly StockLine[],
    context: StockMoveContext
): Promise<void> => {
    for (const { productId, quantity } of mergeStockLines(lines)) {
        await tx.product.updateMany({
            where: { id: productId, portalId, currentQuantity: { lte: 0 } },
            data: { isAvailable: true },
        });
        await tx.product.updateMany({
            where: { id: productId, portalId },
            data: { currentQuantity: { increment: quantity } },
        });
        await journal(tx, portalId, productId, quantity, "order_cancelled", context);
    }
};
