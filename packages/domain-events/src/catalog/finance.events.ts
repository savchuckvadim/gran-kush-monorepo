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
