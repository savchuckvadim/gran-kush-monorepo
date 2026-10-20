import { z } from "zod";

import { defineEvent } from "../define-event";

/** Parameters of a notification text: plain values and stage labels, never personal data. */
const params = z.record(z.string(), z.unknown());

/**
 * A personal notification was created: the bell and the toast of its recipient, and the outside
 * channels (Telegram). Exactly one of `employeeId` / `memberId` is set.
 */
export const notificationCreated = defineEvent({
    name: "notification.created",
    version: 1,
    scope: "portal",
    aggregate: "notification",
    payload: z.object({
        notificationId: z.string().min(1),
        recipientKind: z.enum(["employee", "member"]),
        employeeId: z.string().min(1).nullable(),
        memberId: z.string().min(1).nullable(),
        type: z.string().min(1),
        subjectKind: z.string().min(1),
        subjectId: z.string().min(1),
        params,
    }),
    audience: { employee: { by: "employeeId" }, member: { by: "memberId" } },
    publicPayload: ["notificationId", "memberId", "type", "subjectKind", "subjectId", "params"],
    description: "A personal notification for an employee or a member",
});
