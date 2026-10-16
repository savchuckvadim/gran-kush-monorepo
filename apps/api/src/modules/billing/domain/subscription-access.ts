import { SubscriptionStatus } from "@prisma/client";

/**
 * What a club's subscription allows right now.
 *
 * - `ok` — active or trialing;
 * - `grace` — past due, still inside the grace period (works, with a warning);
 * - `missing` / `inactive` / `grace_ended` — closed: the CRM answers 402, the cabinet takes no orders.
 */
export type SubscriptionAccess = "ok" | "grace" | "missing" | "inactive" | "grace_ended";

export const subscriptionAccess = (
    subscription: { status: SubscriptionStatus; graceEndsAt: Date | null } | null,
    now: Date = new Date()
): SubscriptionAccess => {
    // Every club gets a subscription at registration: its absence is a fault, not free access
    if (!subscription) return "missing";
    switch (subscription.status) {
        case SubscriptionStatus.expired:
        case SubscriptionStatus.canceled:
            return "inactive";
        case SubscriptionStatus.past_due:
            return subscription.graceEndsAt && subscription.graceEndsAt < now
                ? "grace_ended"
                : "grace";
        default:
            return "ok";
    }
};

export const isSubscriptionOpen = (access: SubscriptionAccess): boolean =>
    access === "ok" || access === "grace";
