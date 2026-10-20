import { DomainEventPublisher } from "@modules/events/application/domain-event-publisher.service";
import type { NewDomainEvent } from "@modules/events/domain/new-domain-event";
import type { OutboxTransaction } from "@modules/events/domain/outbox-transaction";
import { OutboxRepository } from "@modules/events/domain/repositories/outbox-repository.interface";

const tx = {} as OutboxTransaction;

const placed = (over: Partial<NewDomainEvent> = {}): NewDomainEvent =>
    ({
        name: "order.placed",
        portalId: "portal-1",
        actor: { kind: "member", id: "member-1" },
        aggregateId: "order-1",
        payload: {
            orderId: "order-1",
            orderNumber: "ORD-1",
            memberId: "member-1",
            employeeId: null,
            stageId: "stage-1",
            itemCount: 1,
        },
        ...over,
    }) as NewDomainEvent;

describe("DomainEventPublisher", () => {
    const outbox = { append: jest.fn() };
    const publisher = new DomainEventPublisher(outbox as unknown as OutboxRepository);

    beforeEach(() => jest.clearAllMocks());

    it("собирает конверт по каталогу и пишет его в транзакции владельца", async () => {
        const event = await publisher.publish(tx, placed());

        expect(event).toMatchObject({
            name: "order.placed",
            version: 1,
            portalId: "portal-1",
            aggregate: { kind: "order", id: "order-1" },
        });
        expect(event.id).toMatch(/^[0-9a-f-]{36}$/);
        expect(new Date(event.occurredAt).toISOString()).toBe(event.occurredAt);
        expect(outbox.append).toHaveBeenCalledWith(tx, [event]);
    });

    it("лишние поля payload не попадают в контракт", () => {
        const input = placed();
        const leaky = {
            ...input,
            payload: { ...input.payload, total: "99.00", member: { email: "a@b.c" } },
        } as unknown as NewDomainEvent;

        expect(publisher.toEnvelope(leaky).payload).not.toHaveProperty("total");
        expect(publisher.toEnvelope(leaky).payload).not.toHaveProperty("member");
    });

    it("событие клуба без портала — ошибка, событие аккаунта с порталом — тоже", () => {
        expect(() => publisher.toEnvelope(placed({ portalId: null }))).toThrow(/requires portalId/);
        expect(() =>
            publisher.toEnvelope({
                name: "session.revoked",
                portalId: "portal-1",
                actor: { kind: "user", id: "user-1" },
                aggregateId: "session-1",
                payload: {
                    sessionId: "session-1",
                    userId: "user-1",
                    audience: "crm",
                    reason: "logout",
                },
            })
        ).toThrow(/account-scoped/);
    });

    it("payload не по схеме — ошибка до записи", async () => {
        const broken = {
            ...placed(),
            payload: { orderId: "order-1" },
        } as unknown as NewDomainEvent;

        await expect(publisher.publish(tx, broken)).rejects.toThrow();
        expect(outbox.append).not.toHaveBeenCalled();
    });

    it("пустой список ничего не пишет", async () => {
        await expect(publisher.publishMany(tx, [])).resolves.toEqual([]);
        expect(outbox.append).not.toHaveBeenCalled();
    });
});
