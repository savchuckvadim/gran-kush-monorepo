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

/** Where a ledger entry came from; with the source id it is the idempotency key. */
export const LEDGER_SOURCE_KINDS = ["manual", "order_sale", "import", "reversal", "legacy"] as const;

const PERIOD = z.string().regex(/^[0-9]{4}-[0-9]{2}$/);

/**
 * A ledger entry was recorded: by hand, from a paid order, as a reversal. Amounts and parties
 * never travel in events (they are encrypted at rest); the staff reload the ledger by id.
 */
export const financeEntryRecorded = defineEvent({
    name: "finance.entry_recorded",
    version: 1,
    scope: "portal",
    aggregate: "ledger_entry",
    payload: z.object({
        entryId: z.string().min(1),
        direction: z.enum(["income", "expense", "transfer"]),
        categoryId: z.string().min(1).nullable(),
        /** Month of the entry, `YYYY-MM` */
        period: PERIOD,
        source: z.enum(LEDGER_SOURCE_KINDS),
        /** The entry this one reverses */
        reversalOf: z.string().min(1).nullable(),
    }),
    audience: { staff: STAFF },
    publicPayload: [],
    description: "A ledger entry was recorded: manual, from a paid order or a reversal",
});

export const financeEntryUpdated = defineEvent({
    name: "finance.entry_updated",
    version: 1,
    scope: "portal",
    aggregate: "ledger_entry",
    payload: z.object({ entryId: z.string().min(1), period: PERIOD }),
    audience: { staff: STAFF },
    publicPayload: [],
    description: "A ledger entry of an open month was corrected or got an attachment",
});

export const financeEntryVoided = defineEvent({
    name: "finance.entry_voided",
    version: 1,
    scope: "portal",
    aggregate: "ledger_entry",
    payload: z.object({ entryId: z.string().min(1), period: PERIOD }),
    audience: { staff: STAFF },
    publicPayload: [],
    description: "A ledger entry of an open month was voided and left the totals",
});

/** One event per confirmed spreadsheet import, not one per row. */
export const financeEntriesImported = defineEvent({
    name: "finance.entries_imported",
    version: 1,
    scope: "portal",
    aggregate: "organization",
    payload: z.object({
        count: z.number().int().nonnegative(),
        periods: z.array(PERIOD),
    }),
    audience: { staff: STAFF },
    publicPayload: [],
    description: "Rows of an uploaded spreadsheet became ledger entries",
});

export const financePeriodClosed = defineEvent({
    name: "finance.period_closed",
    version: 1,
    scope: "portal",
    aggregate: "organization",
    payload: z.object({ period: PERIOD }),
    audience: { staff: STAFF },
    publicPayload: [],
    description: "A month was closed: its entries are frozen, corrections go as reversals",
});

export const financePeriodReopened = defineEvent({
    name: "finance.period_reopened",
    version: 1,
    scope: "portal",
    aggregate: "organization",
    payload: z.object({ period: PERIOD }),
    audience: { staff: STAFF },
    publicPayload: [],
    description: "A closed month was opened again by a finance admin",
});

const DIRECTORY_CHANGES = ["created", "updated", "archived"] as const;

export const financeCategoriesChanged = defineEvent({
    name: "finance.categories_changed",
    version: 1,
    scope: "portal",
    aggregate: "organization",
    payload: z.object({
        categoryId: z.string().min(1),
        change: z.enum(DIRECTORY_CHANGES),
    }),
    audience: { staff: STAFF },
    publicPayload: [],
    description: "An income or expense category of the club was added, renamed or archived",
});

export const financeCounterpartiesChanged = defineEvent({
    name: "finance.counterparties_changed",
    version: 1,
    scope: "portal",
    aggregate: "organization",
    payload: z.object({
        counterpartyId: z.string().min(1),
        change: z.enum(DIRECTORY_CHANGES),
    }),
    audience: { staff: STAFF },
    publicPayload: [],
    description: "A supplier, customer or other counterparty was added, changed or archived",
});

/** Data left the system: an export of entries or a book for the gestor. Visible to finance admins. */
export const financeAccessed = defineEvent({
    name: "finance.accessed",
    version: 1,
    scope: "portal",
    aggregate: "organization",
    payload: z.object({
        kind: z.enum(["export"]),
        book: z.enum(["entries", "purchases", "sales"]),
        from: z.string().min(1),
        to: z.string().min(1),
    }),
    audience: { staff: { permission: "finance.admin" } },
    publicPayload: [],
    description: "Ledger data was exported: entries or the purchases or sales book",
});
