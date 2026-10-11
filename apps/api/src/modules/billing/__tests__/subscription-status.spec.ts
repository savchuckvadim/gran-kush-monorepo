import { SubscriptionStatus } from "@prisma/client";

import {
    graceEndFor,
    toSubscriptionStatus,
} from "@modules/billing/application/subscription-status";
import { amountToCents, centsToAmount } from "@modules/billing/domain/money";

describe("toSubscriptionStatus", () => {
    it.each([
        ["active", SubscriptionStatus.active],
        ["trialing", SubscriptionStatus.trialing],
        ["past_due", SubscriptionStatus.past_due],
        ["unpaid", SubscriptionStatus.past_due],
        ["canceled", SubscriptionStatus.canceled],
        ["incomplete_expired", SubscriptionStatus.canceled],
        ["incomplete", null],
        ["paused", null],
    ])("Stripe %s → %s", (stripeStatus, expected) => {
        expect(toSubscriptionStatus(stripeStatus)).toBe(expected);
    });
});

describe("graceEndFor", () => {
    const fresh = new Date("2026-10-18T00:00:00Z");
    const started = new Date("2026-10-15T00:00:00Z");

    it("starts the grace period on the first failed renewal", () => {
        expect(
            graceEndFor(
                SubscriptionStatus.past_due,
                { status: SubscriptionStatus.active, graceEndsAt: null },
                () => fresh
            )
        ).toBe(fresh);
    });

    it("does not move an already running grace period", () => {
        expect(
            graceEndFor(
                SubscriptionStatus.past_due,
                { status: SubscriptionStatus.past_due, graceEndsAt: started },
                () => fresh
            )
        ).toBe(started);
    });

    it("clears grace once paid, keeps it while the status is unknown", () => {
        const current = { status: SubscriptionStatus.past_due, graceEndsAt: started };
        expect(graceEndFor(SubscriptionStatus.active, current, () => fresh)).toBeNull();
        expect(graceEndFor(null, current, () => fresh)).toBe(started);
    });
});

describe("money", () => {
    it("converts without float drift", () => {
        expect(amountToCents("49.00")).toBe(4900);
        expect(amountToCents("29.99")).toBe(2999);
        expect(amountToCents("5")).toBe(500);
        expect(centsToAmount(4900 * 3)).toBe("147.00");
        expect(centsToAmount(7)).toBe("0.07");
    });
});
