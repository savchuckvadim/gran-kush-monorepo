import { Prisma } from "@prisma/client";

import { isUniqueViolationOn, uniqueViolationFields } from "./unique-violation";

const knownError = (code: string, meta: Record<string, unknown>) =>
    new Prisma.PrismaClientKnownRequestError("failed", { code, clientVersion: "test", meta });

/** What Prisma 7 with @prisma/adapter-pg really throws (seen in the order stock e2e). */
const adapterViolation = knownError("P2002", {
    modelName: "Order",
    driverAdapterError: {
        name: "DriverAdapterError",
        cause: {
            originalCode: "23505",
            originalMessage:
                'duplicate key value violates unique constraint "orders_portal_id_order_number_key"',
            kind: "UniqueConstraintViolation",
            constraint: { fields: ["portal_id", "order_number"] },
        },
    },
});

describe("unique violation", () => {
    it("reads the columns from the pg driver adapter error", () => {
        expect(uniqueViolationFields(adapterViolation)).toEqual(
            expect.arrayContaining(["portal_id", "order_number"])
        );
        expect(isUniqueViolationOn(adapterViolation, "order_number")).toBe(true);
        expect(isUniqueViolationOn(adapterViolation, "active_entity_record_id")).toBe(false);
    });

    it("still reads the classic meta.target, as a list or a constraint name", () => {
        expect(
            isUniqueViolationOn(knownError("P2002", { target: ["order_number"] }), "order_number")
        ).toBe(true);
        expect(
            isUniqueViolationOn(
                knownError("P2002", { target: "presence_sessions_active_entity_record_id_key" }),
                "active_entity_record_id"
            )
        ).toBe(true);
    });

    it("ignores other errors", () => {
        expect(uniqueViolationFields(knownError("P2025", { target: ["order_number"] }))).toBeNull();
        expect(uniqueViolationFields(new Error("order_number"))).toBeNull();
        expect(isUniqueViolationOn(undefined, "order_number")).toBe(false);
    });
});
