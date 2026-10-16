import { effectiveMonthlyLimit } from "@modules/portal/crm/club-policy/domain/club-policy";
import {
    itemLimitGrams,
    LIMIT_WINDOW_DAYS,
    limitWindowStart,
    remainingGrams,
} from "@modules/portal/crm/orders/domain/monthly-limit";

describe("monthly limit", () => {
    const on = { monthlyLimitEnabled: true, defaultMonthlyLimitGrams: 60 };

    it("a personal limit wins over the club's default", () => {
        expect(effectiveMonthlyLimit(on, 30)).toBe(30);
        expect(effectiveMonthlyLimit(on, null)).toBe(60);
    });

    it("no limit when the club has limits off or nothing is set", () => {
        expect(effectiveMonthlyLimit({ ...on, monthlyLimitEnabled: false }, 30)).toBeNull();
        expect(effectiveMonthlyLimit({ ...on, defaultMonthlyLimitGrams: null }, null)).toBeNull();
    });

    it("an item counts quantity × grams per unit; a product without the norm does not count", () => {
        expect(itemLimitGrams(2.5, 1)).toBe(2.5);
        expect(itemLimitGrams(3, 0.333)).toBe(0.999);
        expect(itemLimitGrams(10, null)).toBe(0);
    });

    it("what is left never goes below zero; no limit — nothing to count down", () => {
        expect(remainingGrams(60, 12.5)).toBe(47.5);
        expect(remainingGrams(10, 12)).toBe(0);
        expect(remainingGrams(null, 12)).toBeNull();
    });

    it("the window is the last 30 days", () => {
        const now = new Date("2026-10-16T12:00:00.000Z");
        expect(LIMIT_WINDOW_DAYS).toBe(30);
        expect(limitWindowStart(now).toISOString()).toBe("2026-09-16T12:00:00.000Z");
    });
});
