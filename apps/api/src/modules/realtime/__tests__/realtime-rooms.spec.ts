import { type DomainEvent, findEventDefinition } from "@workspace/domain-events";

import {
    connectionRooms,
    eventTargets,
    REALTIME_ROOMS,
} from "@modules/realtime/domain/realtime-rooms";

const envelope = (over: Partial<DomainEvent>): DomainEvent =>
    ({
        id: "e1",
        version: 1,
        portalId: "p1",
        occurredAt: "2026-10-20T10:00:00.000Z",
        actor: { kind: "employee", id: "emp" },
        ...over,
    }) as DomainEvent;

const targetsOf = (event: DomainEvent) => {
    const definition = findEventDefinition(event.name);
    if (!definition) throw new Error(`unknown ${event.name}`);
    return eventTargets(event, definition);
};

describe("комнаты соединения", () => {
    it("сотрудник: клуб, его роль, права, аккаунт и сессия", () => {
        expect(
            connectionRooms({
                audience: "crm",
                userId: "u1",
                sessionId: "s1",
                expiresAt: null,
                portal: {
                    kind: "employee",
                    portalId: "p1",
                    employeeId: "e1",
                    roleId: "r1",
                    permissions: ["orders.read"],
                },
            })
        ).toEqual([
            "user:u1",
            "session:s1",
            "portal:p1:staff",
            "portal:p1:employee:e1",
            "portal:p1:role:r1",
            "portal:p1:permission:orders.read",
        ]);
    });

    it("участник: клуб и он сам; без клуба — только аккаунт и сессия", () => {
        expect(
            connectionRooms({
                audience: "cabinet",
                userId: "u1",
                sessionId: "s1",
                expiresAt: null,
                portal: { kind: "member", portalId: "p1", memberId: "m1" },
            })
        ).toEqual(["user:u1", "session:s1", "portal:p1:members", "portal:p1:member:m1"]);
        expect(
            connectionRooms({
                audience: "cabinet",
                userId: "u1",
                sessionId: "s1",
                expiresAt: null,
                portal: null,
            })
        ).toEqual(["user:u1", "session:s1"]);
    });
});

describe("куда уходит событие", () => {
    it("заказ: сотрудникам с правом — целиком, его участнику — публичные поля", () => {
        const targets = targetsOf(
            envelope({
                name: "order.stage_changed",
                aggregate: { kind: "order", id: "o1" },
                payload: {
                    orderId: "o1",
                    orderNumber: "ORD-1",
                    memberId: "m1",
                    fromStageId: null,
                    toStageId: "st",
                    toStageSemantic: "IN_PROGRESS",
                    employeeId: "emp",
                },
            })
        );
        expect(targets).toEqual([
            {
                audience: "crm",
                view: "full",
                rooms: [REALTIME_ROOMS.permission("p1", "orders.read")],
            },
            { audience: "cabinet", view: "public", rooms: [REALTIME_ROOMS.member("p1", "m1")] },
        ]);
    });

    it("товар: всем сотрудникам и всем участникам клуба", () => {
        const targets = targetsOf(
            envelope({
                name: "product.changed",
                aggregate: { kind: "product", id: "pr" },
                payload: { productId: "pr", change: "updated" },
            })
        );
        expect(targets.map((t) => t.rooms)).toEqual([["portal:p1:staff"], ["portal:p1:members"]]);
    });

    it("вступление: аккаунт человека в обоих приложениях, кабинетные комнаты — одной отправкой", () => {
        const targets = targetsOf(
            envelope({
                name: "member.joined",
                aggregate: { kind: "member", id: "m1" },
                payload: {
                    memberId: "m1",
                    userId: "u1",
                    joinSource: "crm",
                    statusItemId: null,
                    consentStatus: "pending",
                },
            })
        );
        expect(targets).toEqual([
            { audience: "crm", view: "full", rooms: ["portal:p1:permission:members.read"] },
            { audience: "crm", view: "public", rooms: ["user:u1"] },
            { audience: "cabinet", view: "public", rooms: ["user:u1"] },
        ]);
    });

    it("уведомление: только своему адресату — сотруднику в CRM или участнику в кабинете", () => {
        const base = {
            notificationId: "n1",
            type: "order.placed",
            subjectKind: "order",
            subjectId: "o1",
            params: { orderNumber: "ORD-1" },
        };
        const toEmployee = envelope({
            name: "notification.created",
            aggregate: { kind: "notification", id: "n1" },
            payload: { ...base, recipientKind: "employee", employeeId: "e7", memberId: null },
        });
        expect(targetsOf(toEmployee)).toEqual([
            { audience: "crm", view: "full", rooms: [REALTIME_ROOMS.employee("p1", "e7")] },
        ]);
        const toMember = envelope({
            name: "notification.created",
            aggregate: { kind: "notification", id: "n2" },
            payload: { ...base, recipientKind: "member", employeeId: null, memberId: "m3" },
        });
        expect(targetsOf(toMember)).toEqual([
            { audience: "cabinet", view: "public", rooms: [REALTIME_ROOMS.member("p1", "m3")] },
        ]);
    });

    it("событие клуба без клуба никуда не уходит", () => {
        expect(
            targetsOf(
                envelope({
                    name: "product.changed",
                    portalId: null,
                    aggregate: { kind: "product", id: "pr" },
                    payload: { productId: "pr", change: "updated" },
                })
            )
        ).toEqual([]);
    });

    it("отзыв сессии — только аккаунту", () => {
        const targets = targetsOf(
            envelope({
                name: "session.revoked",
                portalId: null,
                actor: { kind: "user", id: "u1" },
                aggregate: { kind: "session", id: "s1" },
                payload: { sessionId: "s1", userId: "u1", audience: "crm", reason: "logout" },
            })
        );
        expect(targets.flatMap((t) => t.rooms)).toEqual(["user:u1", "user:u1"]);
        expect(targets.every((t) => t.view === "public")).toBe(true);
    });
});
