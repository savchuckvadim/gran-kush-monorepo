import { z } from "zod";

import { defineEvent } from "../define-event";

const STAFF = { permission: "orders.read" } as const;

/** Stage semantics of the order funnel (`StageSemantic` on the API). */
export const ORDER_STAGE_SEMANTICS = ["NEW", "IN_PROGRESS", "SUCCESS", "FAILURE"] as const;

export const orderPlaced = defineEvent({
    name: "order.placed",
    version: 1,
    scope: "portal",
    aggregate: "order",
    payload: z.object({
        orderId: z.string().min(1),
        orderNumber: z.string().min(1),
        memberId: z.string().min(1),
        /** The employee who placed it at the desk; `null` for an order from the cabinet. */
        employeeId: z.string().min(1).nullable(),
        stageId: z.string().min(1).nullable(),
        itemCount: z.number().int().nonnegative(),
    }),
    audience: { staff: STAFF, member: { by: "memberId" } },
    publicPayload: ["orderId", "orderNumber", "memberId", "stageId"],
    description: "A new order: from the member cabinet or placed by staff",
});

export const orderStageChanged = defineEvent({
    name: "order.stage_changed",
    version: 1,
    scope: "portal",
    aggregate: "order",
    payload: z.object({
        orderId: z.string().min(1),
        orderNumber: z.string().min(1),
        memberId: z.string().min(1),
        fromStageId: z.string().min(1).nullable(),
        toStageId: z.string().min(1),
        toStageSemantic: z.enum(ORDER_STAGE_SEMANTICS),
        employeeId: z.string().min(1).nullable(),
    }),
    audience: { staff: STAFF, member: { by: "memberId" } },
    publicPayload: [
        "orderId",
        "orderNumber",
        "memberId",
        "fromStageId",
        "toStageId",
        "toStageSemantic",
    ],
    description: "The order moved to another funnel stage",
});

export const orderCancelled = defineEvent({
    name: "order.cancelled",
    version: 1,
    scope: "portal",
    aggregate: "order",
    payload: z.object({
        orderId: z.string().min(1),
        orderNumber: z.string().min(1),
        memberId: z.string().min(1),
        cancelledBy: z.enum(["staff", "member"]),
    }),
    audience: { staff: STAFF, member: { by: "memberId" } },
    publicPayload: ["orderId", "orderNumber", "memberId", "cancelledBy"],
    description: "The order was cancelled; goods went back to stock",
});

export const orderPaymentChanged = defineEvent({
    name: "order.payment_changed",
    version: 1,
    scope: "portal",
    aggregate: "order",
    payload: z.object({
        orderId: z.string().min(1),
        orderNumber: z.string().min(1),
        memberId: z.string().min(1),
        from: z.string().min(1),
        to: z.string().min(1),
        employeeId: z.string().min(1).nullable(),
    }),
    audience: { staff: STAFF, member: { by: "memberId" } },
    publicPayload: ["orderId", "orderNumber", "memberId", "to"],
    description: "The payment status of the order changed",
});
