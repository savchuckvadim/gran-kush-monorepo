import { z } from "zod";

import { defineEvent } from "../define-event";

export const ROLE_CHANGED_PARTS = ["name", "permissions"] as const;

/** Rights of a role changed: the realtime gateway reconnects its employees with the new rights. */
export const roleChanged = defineEvent({
    name: "role.changed",
    version: 1,
    scope: "portal",
    aggregate: "role",
    payload: z.object({
        roleId: z.string().min(1),
        changed: z.array(z.enum(ROLE_CHANGED_PARTS)).min(1),
    }),
    audience: { staff: { permission: "roles.manage" } },
    publicPayload: [],
    description: "A club edited a role: its name or its permissions",
});

export type RoleChangedPart = (typeof ROLE_CHANGED_PARTS)[number];
