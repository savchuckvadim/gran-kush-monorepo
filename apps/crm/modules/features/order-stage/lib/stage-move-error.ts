import { ApiClientError } from "@workspace/api-client/core";

/** Keys of `crm.orders.stage` messages for a failed move. */
export type StageMoveErrorKey = "forbidden" | "closed" | "conflict" | "error";

/**
 * 403 — the role may not move; 409 — a parallel request moved it first; 400 — the order is
 * closed (the interface offers only stages of the order's own funnel).
 */
export function stageMoveErrorKey(error: unknown): StageMoveErrorKey {
    if (!(error instanceof ApiClientError)) return "error";
    switch (error.status) {
        case 403:
            return "forbidden";
        case 409:
            return "conflict";
        case 400:
            return "closed";
        default:
            return "error";
    }
}
