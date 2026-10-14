/**
 * A product ran out while the order was being placed. Thrown inside the order transaction, so
 * nothing was written: no order and no stock change.
 */
export class InsufficientStockError extends Error {
    constructor(readonly productId: string) {
        super(`Insufficient stock for product ${productId}`);
        this.name = "InsufficientStockError";
    }
}
