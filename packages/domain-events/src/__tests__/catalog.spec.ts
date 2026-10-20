import { describe, expect, it } from "vitest";

import {
    type DomainEvent,
    envelopeSchema,
    EVENT_CATALOG,
    EVENT_NAMES,
    findEventDefinition,
    isEventName,
    publicPayloadOf,
} from "../index";

describe("event catalog", () => {
    it("keys match definition names and names follow <aggregate>.<past_tense>", () => {
        for (const [key, definition] of Object.entries(EVENT_CATALOG)) {
            expect(definition.name).toBe(key);
            expect(key).toMatch(/^[a-z_]+\.[a-z_]+$/);
            expect(definition.version).toBeGreaterThanOrEqual(1);
            expect(definition.description.length).toBeGreaterThan(10);
        }
        expect(EVENT_NAMES.length).toBe(Object.keys(EVENT_CATALOG).length);
    });

    it("every public field exists in the payload schema", () => {
        for (const definition of Object.values(EVENT_CATALOG)) {
            const shape = definition.payload.shape as Record<string, unknown>;
            for (const field of definition.publicPayload) {
                expect(shape, `${definition.name}: ${String(field)}`).toHaveProperty(field);
            }
        }
    });

    it("audience fields point at payload fields", () => {
        for (const definition of Object.values(EVENT_CATALOG)) {
            const shape = definition.payload.shape as Record<string, unknown>;
            const audience = definition.audience as {
                member?: { by: string };
                user?: { by: string };
            };
            if (audience.member) expect(shape).toHaveProperty(audience.member.by);
            if (audience.user) expect(shape).toHaveProperty(audience.user.by);
        }
    });

    it("account-scoped events have no portal audience", () => {
        for (const definition of Object.values(EVENT_CATALOG)) {
            if (definition.scope !== "account") continue;
            const audience = definition.audience as { staff?: unknown; members?: unknown };
            expect(audience.staff).toBeUndefined();
            expect(audience.members).toBeUndefined();
        }
    });

    it("payload parsing strips unknown keys", () => {
        const parsed = EVENT_CATALOG["order.placed"].payload.parse({
            orderId: "o1",
            orderNumber: "ORD-1",
            memberId: "m1",
            employeeId: null,
            stageId: "s1",
            itemCount: 2,
            portal: { id: "leak" },
        });
        expect(parsed).not.toHaveProperty("portal");
    });

    it("public payload keeps only the listed fields", () => {
        const event: DomainEvent<"order.payment_changed"> = {
            id: "7c7d0d0e-6a1c-4b0e-9f2e-1a2b3c4d5e6f",
            name: "order.payment_changed",
            version: 1,
            portalId: "p1",
            occurredAt: new Date().toISOString(),
            actor: { kind: "employee", id: "e1" },
            aggregate: { kind: "order", id: "o1" },
            payload: {
                orderId: "o1",
                orderNumber: "ORD-1",
                memberId: "m1",
                from: "pending",
                to: "paid",
                employeeId: "e1",
            },
        };
        expect(envelopeSchema.safeParse(event).success).toBe(true);
        expect(publicPayloadOf(event)).toEqual({
            orderId: "o1",
            orderNumber: "ORD-1",
            memberId: "m1",
            to: "paid",
        });
    });

    it("unknown names are rejected", () => {
        expect(isEventName("order.exploded")).toBe(false);
        expect(findEventDefinition("order.exploded")).toBeUndefined();
        expect(findEventDefinition("order.placed")?.aggregate).toBe("order");
    });
});
