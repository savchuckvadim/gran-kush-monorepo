import { UnauthorizedException } from "@nestjs/common";

import { PrismaService } from "@common/prisma/prisma.service";
import { PaymentEventsService } from "@modules/billing/application/services/payment-events.service";
import {
    PaymentEventInput,
    PaymentWebhookRequest,
    PaymentWebhookVerifier,
} from "@modules/billing/domain/payment-webhook.types";

const PROVIDER = "acme";
const EVENT_ID = "evt_1";

const request = (over: Partial<PaymentWebhookRequest> = {}): PaymentWebhookRequest => ({
    provider: PROVIDER,
    rawBody: '{"id":"evt_1"}',
    headers: { "x-acme-signature": "sig" },
    ...over,
});

const parsed: PaymentEventInput = {
    eventId: EVENT_ID,
    type: "payment.succeeded",
    payload: { id: EVENT_ID },
};

const verifier = (over: Partial<PaymentWebhookVerifier> = {}): PaymentWebhookVerifier => ({
    provider: PROVIDER,
    parseVerified: jest.fn().mockReturnValue(parsed),
    ...over,
});

describe("PaymentEventsService — журнал событий провайдера", () => {
    const build = (verifiers: PaymentWebhookVerifier[] = [verifier()]) => {
        const tx = {
            paymentEvent: { update: jest.fn().mockResolvedValue({}) },
        };
        const prisma = {
            paymentEvent: {
                createMany: jest.fn().mockResolvedValue({ count: 1 }),
                findUnique: jest.fn().mockResolvedValue(null),
                update: jest.fn().mockResolvedValue({}),
            },
            $transaction: jest.fn(async (fn: (c: typeof tx) => Promise<void>) => fn(tx)),
        };
        return {
            prisma,
            tx,
            service: new PaymentEventsService(prisma as unknown as PrismaService, verifiers),
        };
    };

    it("незнакомый провайдер отклоняется до единого обращения к БД", async () => {
        const { prisma, service } = build([]);
        const handle = jest.fn();

        await expect(service.ingest(request(), handle)).rejects.toBeInstanceOf(
            UnauthorizedException
        );
        expect(prisma.paymentEvent.createMany).not.toHaveBeenCalled();
        expect(handle).not.toHaveBeenCalled();
    });

    it("невалидная подпись отклоняется до записи в журнал", async () => {
        const failing = verifier({
            parseVerified: jest.fn(() => {
                throw new UnauthorizedException("Invalid webhook signature");
            }),
        });
        const { prisma, service } = build([failing]);
        const handle = jest.fn();

        await expect(service.ingest(request(), handle)).rejects.toBeInstanceOf(
            UnauthorizedException
        );
        expect(prisma.paymentEvent.createMany).not.toHaveBeenCalled();
        expect(handle).not.toHaveBeenCalled();
    });

    it("новое событие: пишется в журнал, обрабатывается и помечается processedAt в одной транзакции", async () => {
        const { prisma, tx, service } = build();
        const handle = jest.fn().mockResolvedValue(undefined);

        const result = await service.ingest(request(), handle);

        expect(result).toEqual({ outcome: "processed", provider: PROVIDER, eventId: EVENT_ID });
        expect(prisma.paymentEvent.createMany).toHaveBeenCalledWith(
            expect.objectContaining({ skipDuplicates: true })
        );
        expect(handle).toHaveBeenCalledWith(tx, parsed);
        expect(tx.paymentEvent.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { provider_eventId: { provider: PROVIDER, eventId: EVENT_ID } },
                data: expect.objectContaining({ processedAt: expect.any(Date) }),
            })
        );
    });

    it("сырой payload сохраняется первым шагом, до обработчика", async () => {
        const { prisma, service } = build();
        const order: string[] = [];
        prisma.paymentEvent.createMany.mockImplementation(() => {
            order.push("journal");
            return Promise.resolve({ count: 1 });
        });
        const handle = jest.fn(() => {
            order.push("handle");
            return Promise.resolve();
        });

        await service.ingest(request(), handle);

        expect(order).toEqual(["journal", "handle"]);
        expect(prisma.paymentEvent.createMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: [expect.objectContaining({ payload: parsed.payload })],
            })
        );
    });

    it("повторная доставка уже обработанного события не запускает обработчик", async () => {
        const { prisma, service } = build();
        prisma.paymentEvent.createMany.mockResolvedValue({ count: 0 });
        prisma.paymentEvent.findUnique.mockResolvedValue({ processedAt: new Date() });
        const handle = jest.fn();

        const result = await service.ingest(request(), handle);

        expect(result.outcome).toBe("duplicate");
        expect(handle).not.toHaveBeenCalled();
        expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("повтор ещё не обработанного события — ретрай, а не дубль: обработчик вызывается", async () => {
        const { prisma, service } = build();
        prisma.paymentEvent.createMany.mockResolvedValue({ count: 0 });
        prisma.paymentEvent.findUnique.mockResolvedValue({ processedAt: null });
        const handle = jest.fn().mockResolvedValue(undefined);

        const result = await service.ingest(request(), handle);

        expect(result.outcome).toBe("processed");
        expect(handle).toHaveBeenCalled();
    });

    it("падение обработчика: событие помечается failed со счётчиком попыток, ошибка уходит наверх", async () => {
        const { prisma, service } = build();
        const boom = new Error("provider payload mismatch");
        const handle = jest.fn().mockRejectedValue(boom);

        await expect(service.ingest(request(), handle)).rejects.toBe(boom);

        expect(prisma.paymentEvent.update).toHaveBeenCalledWith({
            where: { provider_eventId: { provider: PROVIDER, eventId: EVENT_ID } },
            data: {
                failedAt: expect.any(Date),
                error: "provider payload mismatch",
                attempts: { increment: 1 },
            },
        });
    });

    it("сбой самой отметки об ошибке не подменяет исходную ошибку", async () => {
        const { prisma, service } = build();
        const boom = new Error("provider payload mismatch");
        prisma.paymentEvent.update.mockRejectedValue(new Error("db down"));
        const handle = jest.fn().mockRejectedValue(boom);

        await expect(service.ingest(request(), handle)).rejects.toBe(boom);
    });
});
