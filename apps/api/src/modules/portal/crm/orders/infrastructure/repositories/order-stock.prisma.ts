import { Logger } from "@nestjs/common";

import { Prisma } from "@prisma/client";

import { InsufficientStockError } from "@modules/portal/crm/orders/domain/errors/insufficient-stock.error";
import type { StockLine } from "@modules/portal/crm/orders/domain/repositories/order-repository.interface";

/*
 * Stock moves of an order, always inside the order's own transaction. No "read, check, write":
 * the UPDATE carries the check, so a parallel order waits for the row lock and then sees what is
 * really left (Postgres re-evaluates the WHERE on the fresh row).
 */

const logger = new Logger("OrderStock");

interface MergedLine {
    productId: string;
    quantity: Prisma.Decimal;
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

/** Takes the goods off the shelf or throws {@link InsufficientStockError}, rolling the order back. */
export const reserveStock = async (
    tx: Prisma.TransactionClient,
    portalId: string,
    lines: readonly StockLine[]
): Promise<void> => {
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
    }
};

/** Puts the goods back; a product that had sold out becomes available again. */
export const returnStock = async (
    tx: Prisma.TransactionClient,
    portalId: string,
    lines: readonly StockLine[]
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
    }
};
