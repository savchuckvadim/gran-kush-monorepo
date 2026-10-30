import { z } from "zod";

import { defineEvent } from "../define-event";

/** Kind of a background operation: `<module>.<verb>`, e.g. `finance.export_books`. */
const operationKind = z.string().min(1).max(80);

/** The author is the only receiver: the event lands in that employee's room alone. */
const payload = z.object({
    operationId: z.string().min(1),
    kind: operationKind,
    employeeId: z.string().min(1),
});

/**
 * A background operation (TASK-809) finished. The result never travels in the event: the CRM of
 * the author reads it with `GET /crm/operations/:id`, where the rights are checked again.
 */
export const operationFinished = defineEvent({
    name: "operation.finished",
    version: 1,
    scope: "portal",
    aggregate: "operation",
    payload,
    audience: { employee: { by: "employeeId" } },
    publicPayload: [],
    description: "A background operation of an employee finished; the result is on the API",
});

/** `errorCode` is a machine reason (`operation_failed`, the code of a domain error), never internals. */
export const operationFailed = defineEvent({
    name: "operation.failed",
    version: 1,
    scope: "portal",
    aggregate: "operation",
    payload: payload.extend({ errorCode: z.string().min(1).max(80) }),
    audience: { employee: { by: "employeeId" } },
    publicPayload: [],
    description: "A background operation of an employee failed with a machine reason",
});
