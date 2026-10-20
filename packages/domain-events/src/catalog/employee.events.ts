import { z } from "zod";

import { defineEvent } from "../define-event";

const STAFF = { permission: "employees.read" } as const;

export const employeeJoined = defineEvent({
    name: "employee.joined",
    version: 1,
    scope: "portal",
    aggregate: "employee",
    payload: z.object({
        employeeId: z.string().min(1),
        userId: z.string().min(1),
        roleId: z.string().min(1),
    }),
    audience: { staff: STAFF, user: { by: "userId" } },
    publicPayload: ["employeeId", "roleId"],
    description: "An account joined the club team: founder, accepted invitation or added by staff",
});

/** Rights of the employee changed; the realtime gateway recomputes their rooms on it. */
export const employeeAccessChanged = defineEvent({
    name: "employee.access_changed",
    version: 1,
    scope: "portal",
    aggregate: "employee",
    payload: z.object({
        employeeId: z.string().min(1),
        userId: z.string().min(1),
        roleId: z.string().min(1),
        isActive: z.boolean(),
    }),
    audience: { staff: STAFF, user: { by: "userId" } },
    publicPayload: ["employeeId", "roleId", "isActive"],
    description: "The role of an employee changed or the employee was deactivated",
});
