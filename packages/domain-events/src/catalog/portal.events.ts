import { z } from "zod";

import { defineEvent } from "../define-event";

/** A club was founded; the welcome letter and the platform alert are consumers of this event. */
export const portalFounded = defineEvent({
    name: "portal.founded",
    version: 1,
    scope: "portal",
    aggregate: "portal",
    payload: z.object({
        portalSlug: z.string().min(1),
        portalDisplayName: z.string().min(1),
        ownerUserId: z.string().min(1),
        ownerEmployeeId: z.string().min(1),
        ownerName: z.string(),
        /** UI locale of the founder at sign-up; letters follow it. */
        language: z.string().min(2).max(5).optional(),
    }),
    audience: {},
    publicPayload: [],
    description: "A club was founded by an account that became its owner",
});
