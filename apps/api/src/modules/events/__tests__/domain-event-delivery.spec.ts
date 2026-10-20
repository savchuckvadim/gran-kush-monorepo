import { Injectable } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { Test } from "@nestjs/testing";

import type { DomainEvent } from "@workspace/domain-events";
import type { Job, Queue } from "bullmq";

import type { TelegramService } from "@common/telegram/telegram.service";
import { DomainEventConsumerRegistry } from "@modules/events/application/domain-event-consumer.registry";
import { OnDomainEvent } from "@modules/events/application/on-domain-event.decorator";
import type { OutboxRepository } from "@modules/events/domain/repositories/outbox-repository.interface";
import type { DeliverJobData } from "@modules/events/infrastructure/deliver-job";
import { DomainEventsProcessor } from "@modules/events/infrastructure/domain-events.processor";
import { OutboxRelayService } from "@modules/events/infrastructure/outbox-relay.service";

const event = (over: Partial<DomainEvent> = {}): DomainEvent =>
    ({
        id: "7c7d0d0e-6a1c-4b0e-9f2e-1a2b3c4d5e6f",
        name: "presence.entered",
        version: 1,
        portalId: "portal-1",
        occurredAt: "2026-10-20T10:00:00.000Z",
        actor: { kind: "employee", id: "employee-1" },
        aggregate: { kind: "presence_session", id: "session-1" },
        payload: {
            sessionId: "session-1",
            memberId: "member-1",
            entryMethod: "qr",
            employeeId: "employee-1",
        },
        ...over,
    }) as DomainEvent;

@Injectable()
class DeskConsumer {
    readonly seen: string[] = [];

    @OnDomainEvent("presence.entered", "presence.left")
    onPresence(e: DomainEvent): void {
        this.seen.push(e.name);
    }
}

describe("реестр потребителей", () => {
    it("находит методы с @OnDomainEvent среди провайдеров", async () => {
        const module = await Test.createTestingModule({
            imports: [DiscoveryModule],
            providers: [DomainEventConsumerRegistry, DeskConsumer],
        }).compile();
        await module.init();
        const registry = module.get(DomainEventConsumerRegistry);

        expect(registry.consumersFor("presence.entered")).toEqual(["DeskConsumer"]);
        expect(registry.consumersFor("order.placed")).toEqual([]);
        await registry.handlerFor(
            "DeskConsumer",
            "presence.left"
        )?.(event({ name: "presence.left" }));
        expect(module.get(DeskConsumer).seen).toEqual(["presence.left"]);
    });

    it("двойная подписка одного потребителя — ошибка на старте", () => {
        const registry = new DomainEventConsumerRegistry({} as never, {} as never, {} as never);
        registry.register("A", ["order.placed"], jest.fn());
        expect(() => registry.register("A", ["order.placed"], jest.fn())).toThrow(/twice/);
    });
});

describe("релей outbox", () => {
    const setup = (consumers: Record<string, string[]>) => {
        const queue = { addBulk: jest.fn() };
        const outbox = {
            claimUndispatched: jest.fn(
                async (_limit: number, dispatch: (events: DomainEvent[]) => Promise<void>) => {
                    const batch = [event(), event({ id: "e2", name: "order.placed" })];
                    await dispatch(batch);
                    return batch.length;
                }
            ),
        };
        const registry = {
            consumersFor: (name: string) => consumers[name] ?? [],
        } as unknown as DomainEventConsumerRegistry;
        const config = {
            get: (key: string) => (key === "DOMAIN_EVENTS_RELAY_BATCH_SIZE" ? "50" : undefined),
        };
        const relay = new OutboxRelayService(
            outbox as unknown as OutboxRepository,
            registry,
            queue as unknown as Queue<DeliverJobData>,
            config as never
        );
        return { relay, queue, outbox };
    };

    it("ставит задачу на каждую пару событие × потребитель с детерминированным jobId", async () => {
        const { relay, queue, outbox } = setup({ "presence.entered": ["Desk", "Notify"] });

        await expect(relay.relayOnce()).resolves.toBe(2);

        expect(outbox.claimUndispatched).toHaveBeenCalledWith(50, expect.any(Function));
        expect(queue.addBulk).toHaveBeenCalledWith([
            expect.objectContaining({
                data: expect.objectContaining({ consumer: "Desk" }),
                opts: { jobId: `evt__${event().id}__Desk` },
            }),
            expect.objectContaining({
                data: expect.objectContaining({ consumer: "Notify" }),
                opts: { jobId: `evt__${event().id}__Notify` },
            }),
        ]);
    });

    it("событие без потребителей просто помечается разданным", async () => {
        const { relay, queue } = setup({});

        await relay.relayOnce();

        expect(queue.addBulk).not.toHaveBeenCalled();
    });
});

describe("воркер доставки", () => {
    const setup = (delivered: boolean, handler: jest.Mock) => {
        const outbox = {
            deliveryState: jest.fn().mockResolvedValue(delivered ? "delivered" : "pending"),
            markDelivered: jest.fn(),
            markFailed: jest.fn(),
        };
        const registry = {
            handlerFor: (consumer: string) => (consumer === "Desk" ? handler : undefined),
        } as unknown as DomainEventConsumerRegistry;
        const telegram = { sendMessage: jest.fn().mockResolvedValue(undefined) };
        const processor = new DomainEventsProcessor(
            registry,
            outbox as unknown as OutboxRepository,
            telegram as unknown as TelegramService
        );
        const job = (consumer = "Desk", attemptsMade = 1) =>
            ({
                name: "deliver",
                data: { event: event(), consumer },
                attemptsMade,
                opts: { attempts: 5 },
            }) as unknown as Job<DeliverJobData>;
        return { processor, outbox, telegram, job };
    };

    it("вызывает потребителя и отмечает доставку", async () => {
        const handler = jest.fn();
        const { processor, outbox, job } = setup(false, handler);

        await processor.process(job());

        expect(handler).toHaveBeenCalledWith(event());
        expect(outbox.markDelivered).toHaveBeenCalledWith(event().id, "Desk");
    });

    it("повтор уже доставленного не вызывает потребителя второй раз", async () => {
        const handler = jest.fn();
        const { processor, outbox, job } = setup(true, handler);

        await processor.process(job());

        expect(handler).not.toHaveBeenCalled();
        expect(outbox.markDelivered).not.toHaveBeenCalled();
    });

    it("ошибка потребителя записывается и уходит в повтор очереди", async () => {
        const handler = jest.fn().mockRejectedValue(new Error("smtp down"));
        const { processor, outbox, job } = setup(false, handler);

        await expect(processor.process(job())).rejects.toThrow("smtp down");
        expect(outbox.markFailed).toHaveBeenCalledWith(event().id, "Desk", "smtp down");
        expect(outbox.markDelivered).not.toHaveBeenCalled();
    });

    it("неизвестный потребитель — пропуск без ошибки", async () => {
        const { processor, outbox, job } = setup(false, jest.fn());

        await processor.process(job("Removed"));

        expect(outbox.deliveryState).not.toHaveBeenCalled();
    });

    it("событие удалено вместе с клубом — потребитель не вызывается", async () => {
        const handler = jest.fn();
        const { processor, outbox, job } = setup(false, handler);
        outbox.deliveryState.mockResolvedValue("missing");

        await processor.process(job());

        expect(handler).not.toHaveBeenCalled();
        expect(outbox.markDelivered).not.toHaveBeenCalled();
    });

    it("исчерпанные попытки — алерт в Telegram, промежуточные — нет", () => {
        const { processor, telegram, job } = setup(false, jest.fn());

        processor.onFailed(job("Desk", 2), new Error("down"));
        expect(telegram.sendMessage).not.toHaveBeenCalled();

        processor.onFailed(job("Desk", 5), new Error("down"));
        expect(telegram.sendMessage).toHaveBeenCalledWith(
            expect.stringContaining("presence.entered")
        );
    });
});
