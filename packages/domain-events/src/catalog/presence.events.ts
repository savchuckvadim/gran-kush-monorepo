import { z } from "zod";

import { defineEvent } from "../define-event";

const STAFF = { permission: "presence.read" } as const;

export const presenceEntered = defineEvent({
    name: "presence.entered",
    version: 1,
    scope: "portal",
    aggregate: "presence_session",
    payload: z.object({
        sessionId: z.string().min(1),
        memberId: z.string().min(1),
        entryMethod: z.string().min(1),
        employeeId: z.string().min(1).nullable(),
    }),
    audience: { staff: STAFF, member: { by: "memberId" } },
    publicPayload: ["sessionId", "memberId"],
    description: "A member entered the club (QR scan or a manual check-in)",
});

export const presenceLeft = defineEvent({
    name: "presence.left",
    version: 1,
    scope: "portal",
    aggregate: "presence_session",
    payload: z.object({
        sessionId: z.string().min(1),
        memberId: z.string().min(1),
        exitMethod: z.string().min(1),
        employeeId: z.string().min(1).nullable(),
    }),
    audience: { staff: STAFF, member: { by: "memberId" } },
    publicPayload: ["sessionId", "memberId"],
    description: "A member left the club (QR scan, manual check-out or the automatic exit)",
});
