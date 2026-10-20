import { z } from "zod";

import { defineEvent } from "../define-event";

/** Any employee reads the catalog, so no permission is required for staff. */
const STAFF = { permission: null } as const;

export const productChanged = defineEvent({
    name: "product.changed",
    version: 1,
    scope: "portal",
    aggregate: "product",
    payload: z.object({
        productId: z.string().min(1),
        change: z.enum(["created", "updated", "deleted"]),
    }),
    audience: { staff: STAFF, members: true },
    publicPayload: ["productId", "change"],
    description: "A product was created, edited or deleted",
});

export const productStockChanged = defineEvent({
    name: "product.stock_changed",
    version: 1,
    scope: "portal",
    aggregate: "product",
    payload: z.object({
        productId: z.string().min(1),
        reason: z.enum(["order_placed", "order_cancelled", "manual"]),
        orderId: z.string().min(1).nullable(),
    }),
    audience: { staff: STAFF, members: true },
    /** Members only learn that availability may have changed, never why. */
    publicPayload: ["productId"],
    description:
        "Stock of a product moved: an order took it, a cancellation returned it, staff edited it",
});
