import { z } from "zod";

import { defineEvent } from "../define-event";

const STAFF = { permission: "finance.read" } as const;

/** The organization profile (legal form, tax regimes, identity) changed. No identity in the payload. */
export const financeProfileUpdated = defineEvent({
    name: "finance.profile_updated",
    version: 1,
    scope: "portal",
    aggregate: "organization",
    payload: z.object({
        legalForm: z.string().min(1),
        vatRegime: z.string().min(1),
        incomeTaxRegime: z.string().min(1),
    }),
    audience: { staff: STAFF },
    publicPayload: [],
    description: "The organization profile used for accounting and documents was saved",
});

/**
 * A tax rate of the club was added, changed, archived or became the default. Product forms of the
 * staff reload the rates; members reload the shop, because prices "plus tax" depend on the rate.
 */
export const financeTaxRatesChanged = defineEvent({
    name: "finance.tax_rates_changed",
    version: 1,
    scope: "portal",
    aggregate: "organization",
    payload: z.object({
        taxRateId: z.string().min(1),
        change: z.enum(["created", "updated", "archived", "default_changed"]),
    }),
    audience: { staff: { permission: null }, members: true },
    publicPayload: [],
    description: "A tax rate of the club was added, changed, archived or became the default",
});
