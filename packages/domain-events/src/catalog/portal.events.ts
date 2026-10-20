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

/** A pluggable module (finance, later booking) was switched on or off: menus follow it. */
export const portalModuleChanged = defineEvent({
    name: "portal.module_changed",
    version: 1,
    scope: "portal",
    aggregate: "portal",
    payload: z.object({
        module: z.string().min(1),
        enabled: z.boolean(),
    }),
    audience: { staff: { permission: null } },
    publicPayload: ["module", "enabled"],
    description: "A portal module was enabled or disabled",
});
