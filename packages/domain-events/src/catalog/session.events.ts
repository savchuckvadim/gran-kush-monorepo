import { z } from "zod";

import { defineEvent } from "../define-event";

/** Sign-in sessions of an account (`auth_sessions` on the API). */
export const SESSION_AUDIENCES = ["crm", "cabinet"] as const;

export const sessionRevoked = defineEvent({
    name: "session.revoked",
    version: 1,
    scope: "account",
    aggregate: "session",
    payload: z.object({
        sessionId: z.string().min(1),
        userId: z.string().min(1),
        audience: z.enum(SESSION_AUDIENCES),
        reason: z.string().min(1),
    }),
    audience: { user: { by: "userId" } },
    publicPayload: [],
    description: "A sign-in session ended: logout, revoked from account security, expired",
});
