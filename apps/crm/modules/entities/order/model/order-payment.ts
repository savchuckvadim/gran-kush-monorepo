import type { PaymentStatus } from "./order.types";

/** In the order the API allows them: pending → paid → refunded. */
export const PAYMENT_STATUSES: readonly PaymentStatus[] = ["pending", "paid", "refunded"];

/** Offered once an order is paid. */
export const PAYMENT_METHODS = ["cash", "card", "crypto"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const isPaymentStatus = (value: unknown): value is PaymentStatus =>
    typeof value === "string" && PAYMENT_STATUSES.some((status) => status === value);
