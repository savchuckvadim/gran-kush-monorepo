import { IdempotencyStatus, Prisma } from "@prisma/client";

import { IdempotencyIdentity, IdempotencyService } from "@common/idempotency";
import { PrismaService } from "@common/prisma/prisma.service";

const IDENTITY: IdempotencyIdentity = {
    scope: "lk.orders.create",
    ownerKey: "portal-a:member:m-1",
    key: "key-1",
};

const HASH = "a".repeat(64);
const NOW = new Date("2026-08-29T10:00:00Z");

const row = (over: Record<string, unknown> = {}) => ({
    id: "idem-1",
    ...IDENTITY,
    requestHash: HASH,
    status: IdempotencyStatus.completed,
    statusCode: 201,
    response: { id: "order-1" },
    createdAt: NOW,
    completedAt: NOW,
    expiresAt: new Date("2026-08-30T10:00:00Z"),
    ...over,
});

const build = () => {
    const prisma = {
        idempotencyKey: {
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
            findUnique: jest.fn().mockResolvedValue(null),
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
    };
    return { prisma, service: new IdempotencyService(prisma as unknown as PrismaService) };
};

describe("IdempotencyService — хеш запроса", () => {
    it("порядок полей в теле не превращает тот же запрос в другой", () => {
        const { service } = build();

        expect(service.hashRequest({ a: 1, b: [2, { c: 3, d: 4 }] })).toBe(
            service.hashRequest({ b: [2, { d: 4, c: 3 }], a: 1 })
        );
    });

    it("другое тело даёт другой хеш", () => {
        const { service } = build();

        expect(service.hashRequest({ amount: 10 })).not.toBe(service.hashRequest({ amount: 11 }));
    });

    it("порядок элементов массива значим — это разные запросы", () => {
        const { service } = build();

        expect(service.hashRequest({ items: [1, 2] })).not.toBe(
            service.hashRequest({ items: [2, 1] })
        );
    });
});

describe("IdempotencyService.acquire", () => {
    it("свободный ключ занимается вставкой через ON CONFLICT DO NOTHING", async () => {
        const { prisma, service } = build();

        const outcome = await service.acquire(IDENTITY, HASH, NOW);

        expect(outcome).toEqual({ kind: "acquired" });
        expect(prisma.idempotencyKey.createMany).toHaveBeenCalledWith(
            expect.objectContaining({ skipDuplicates: true })
        );
        // На моке нет idempotencyKey.create — обращение к нему уронило бы тест: create
        // бросил бы P2002, а внутри транзакции это оставило бы её в aborted-состоянии
        // (грабли TASK-101).
    });

    it("повтор с тем же телом возвращает сохранённый ответ, а не выполняет запрос заново", async () => {
        const { prisma, service } = build();
        prisma.idempotencyKey.createMany.mockResolvedValue({ count: 0 });
        prisma.idempotencyKey.findUnique.mockResolvedValue(row());

        const outcome = await service.acquire(IDENTITY, HASH, NOW);

        expect(outcome).toEqual({
            kind: "replay",
            statusCode: 201,
            response: { id: "order-1" },
        });
    });

    it("тот же ключ с другим телом — ошибка клиента, а не повтор", async () => {
        const { prisma, service } = build();
        prisma.idempotencyKey.createMany.mockResolvedValue({ count: 0 });
        prisma.idempotencyKey.findUnique.mockResolvedValue(row({ requestHash: "b".repeat(64) }));

        const outcome = await service.acquire(IDENTITY, HASH, NOW);

        expect(outcome).toEqual({ kind: "mismatch" });
    });

    it("несовпадение тела важнее статуса: незавершённый ключ с другим телом тоже mismatch", async () => {
        const { prisma, service } = build();
        prisma.idempotencyKey.createMany.mockResolvedValue({ count: 0 });
        prisma.idempotencyKey.findUnique.mockResolvedValue(
            row({ requestHash: "b".repeat(64), status: IdempotencyStatus.in_progress })
        );

        const outcome = await service.acquire(IDENTITY, HASH, NOW);

        expect(outcome).toEqual({ kind: "mismatch" });
    });

    it("параллельный запрос под тем же ключом ещё в работе — 409, а не второе выполнение", async () => {
        const { prisma, service } = build();
        prisma.idempotencyKey.createMany.mockResolvedValue({ count: 0 });
        prisma.idempotencyKey.findUnique.mockResolvedValue(
            row({ status: IdempotencyStatus.in_progress, statusCode: null, response: null })
        );

        const outcome = await service.acquire(IDENTITY, HASH, NOW);

        expect(outcome).toEqual({ kind: "in_progress" });
    });

    it("протухшая строка снимается до вставки и не держит ключ занятым навсегда", async () => {
        const { prisma, service } = build();

        await service.acquire(IDENTITY, HASH, NOW);

        expect(prisma.idempotencyKey.deleteMany).toHaveBeenCalledWith({
            where: { ...IDENTITY, expiresAt: { lt: NOW } },
        });
    });

    it("строка, исчезнувшая между конфликтом и чтением, приводит к повторной попытке", async () => {
        const { prisma, service } = build();
        prisma.idempotencyKey.createMany
            .mockResolvedValueOnce({ count: 0 })
            .mockResolvedValueOnce({ count: 1 });
        prisma.idempotencyKey.findUnique.mockResolvedValue(null);

        const outcome = await service.acquire(IDENTITY, HASH, NOW);

        expect(outcome).toEqual({ kind: "acquired" });
        expect(prisma.idempotencyKey.createMany).toHaveBeenCalledTimes(2);
    });

    it("если строка исчезает и во второй раз — запрос выполняется без защиты, а не падает", async () => {
        const { prisma, service } = build();
        prisma.idempotencyKey.createMany.mockResolvedValue({ count: 0 });
        prisma.idempotencyKey.findUnique.mockResolvedValue(null);

        const outcome = await service.acquire(IDENTITY, HASH, NOW);

        expect(outcome).toEqual({ kind: "acquired" });
        expect(prisma.idempotencyKey.createMany).toHaveBeenCalledTimes(2);
    });
});

describe("IdempotencyService.complete / release", () => {
    it("ответ сохраняется только поверх незавершённой строки", async () => {
        const { prisma, service } = build();

        await service.complete(IDENTITY, 201, { id: "order-1" }, NOW);

        expect(prisma.idempotencyKey.updateMany).toHaveBeenCalledWith({
            where: { ...IDENTITY, status: IdempotencyStatus.in_progress },
            data: {
                status: IdempotencyStatus.completed,
                statusCode: 201,
                response: { id: "order-1" },
                completedAt: NOW,
            },
        });
    });

    it("пустой ответ пишется как DbNull, а не ломает вставку JSON", async () => {
        const { prisma, service } = build();

        await service.complete(IDENTITY, 204, undefined, NOW);

        expect(prisma.idempotencyKey.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ response: Prisma.DbNull }),
            })
        );
    });

    it("ошибка снимает ключ — иначе осмысленный ретрай клиента упирался бы в 409", async () => {
        const { prisma, service } = build();

        await service.release(IDENTITY);

        expect(prisma.idempotencyKey.deleteMany).toHaveBeenCalledWith({
            where: { ...IDENTITY, status: IdempotencyStatus.in_progress },
        });
    });
});

describe("IdempotencyService.purgeExpired", () => {
    it("удаляет только протухшие строки", async () => {
        const { prisma, service } = build();
        prisma.idempotencyKey.deleteMany.mockResolvedValue({ count: 7 });

        const removed = await service.purgeExpired(NOW);

        expect(removed).toBe(7);
        expect(prisma.idempotencyKey.deleteMany).toHaveBeenCalledWith({
            where: { expiresAt: { lt: NOW } },
        });
    });
});
