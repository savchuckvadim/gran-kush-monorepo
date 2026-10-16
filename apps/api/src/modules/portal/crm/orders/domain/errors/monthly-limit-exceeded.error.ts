/**
 * The order would take the member over their limit for the last 30 days. Thrown inside the order
 * transaction, so nothing was written: no order and no stock change.
 */
export class MonthlyLimitExceededError extends Error {
    constructor(readonly remainingGrams: number) {
        super(`Monthly limit exceeded: ${remainingGrams} g left`);
        this.name = "MonthlyLimitExceededError";
    }
}
