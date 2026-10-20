import type { DomainEvent } from "@workspace/domain-events";

import { orderNotificationPlans } from "@modules/notifications/domain/order-notification-rules";

const event = (name: DomainEvent["name"], payload: Record<string, unknown>): DomainEvent =>
    ({
        id: "evt-1",
        name,
        version: 1,
        portalId: "p1",
        occurredAt: "2026-10-20T10:00:00.000Z",
        actor: { kind: "system", id: null },
        aggregate: { kind: "order", id: "o1" },
        payload,
    }) as DomainEvent;

const order = { orderId: "o1", orderNumber: "ORD-1", memberId: "m1" };
const stage = { label: "Готов", labelI18n: { es: "Listo", en: "Ready" } };
const context = { club: "Club Sol", stage };

describe("уведомления о заказах", () => {
    it("заказ из кабинета — персоналу с orders.read; заказ на стойке — никому", () => {
        const fromCabinet = orderNotificationPlans(
            event("order.placed", { ...order, employeeId: null, stageId: null, itemCount: 2 }),
            context
        );
        expect(fromCabinet).toEqual([
            {
                draft: {
                    portalId: "p1",
                    eventId: "evt-1",
                    type: "order.placed",
                    subject: { kind: "order", id: "o1" },
                    params: { orderNumber: "ORD-1", itemCount: 2, club: "Club Sol" },
                },
                to: { staffWith: "orders.read", except: null },
            },
        ]);
        const atDesk = event("order.placed", {
            ...order,
            employeeId: "e1",
            stageId: null,
            itemCount: 1,
        });
        expect(orderNotificationPlans(atDesk, context)).toEqual([]);
    });

    it("отмена участником — персоналу, отмена клубом — участнику", () => {
        const byMember = orderNotificationPlans(
            event("order.cancelled", { ...order, cancelledBy: "member" }),
            context
        );
        expect(byMember.map((plan) => [plan.draft.type, plan.to])).toEqual([
            ["order.cancelled_by_member", { staffWith: "orders.read", except: null }],
        ]);
        const byStaff = orderNotificationPlans(
            event("order.cancelled", { ...order, cancelledBy: "staff" }),
            context
        );
        expect(byStaff.map((plan) => [plan.draft.type, plan.to])).toEqual([
            ["order.cancelled_by_staff", { member: "m1" }],
        ]);
    });

    it("стадию сменил сотрудник — участнику со словом клуба; отмену и ход участника не дублируем", () => {
        const moved = (employeeId: string | null, semantic: string) =>
            orderNotificationPlans(
                event("order.stage_changed", {
                    ...order,
                    fromStageId: "s0",
                    toStageId: "s1",
                    toStageSemantic: semantic,
                    employeeId,
                }),
                context
            );
        expect(moved("e1", "IN_PROGRESS")).toEqual([
            expect.objectContaining({
                draft: expect.objectContaining({
                    type: "order.stage_changed",
                    params: {
                        orderNumber: "ORD-1",
                        club: "Club Sol",
                        stage,
                        semantic: "IN_PROGRESS",
                    },
                }),
                to: { member: "m1" },
            }),
        ]);
        expect(moved("e1", "FAILURE")).toEqual([]);
        expect(moved(null, "SUCCESS")).toEqual([]);
    });
});
