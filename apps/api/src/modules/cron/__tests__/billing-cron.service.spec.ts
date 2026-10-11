import { SubscriptionStatus } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { BillingSettings } from "@modules/billing/application/billing-settings";
import { BillingCronService } from "@modules/cron/services/billing-cron.service";

type LockedRow = { id: string };

/** То, что Prisma.sql передаёт в $queryRaw: нас интересует только текст запроса. */
type RawQuery = { sql?: string; strings?: string[]; values?: unknown[] };

const sqlOf = (query: RawQuery) => query.sql ?? (query.strings ?? []).join("?");

const GRACE_DAYS = 7;
const settings = {
    graceEndFrom: (from: Date) => new Date(from.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000),
} as BillingSettings;

/**
 * `byStep` — пачки для каждого перехода по порядку: конец триала, конец ручного срока,
 * конец льготного периода. Незаданные шаги возвращают пустую пачку.
 */
const buildPrisma = (byStep: LockedRow[][][]) => {
    const queryRaw = jest.fn<Promise<LockedRow[]>, [RawQuery]>();
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    let step = 0;
    let batchInStep = 0;
    queryRaw.mockImplementation(async () => {
        const batches = byStep[step] ?? [];
        const batch = batches[batchInStep] ?? [];
        batchInStep += 1;
        // Неполная пачка закрывает шаг — дальше пойдёт следующий переход
        if (batch.length < 100) {
            step += 1;
            batchInStep = 0;
        }
        return batch;
    });

    const tx = {
        $queryRaw: queryRaw,
        portalSubscription: { updateMany },
        portal: { updateMany: jest.fn() },
    };
    const prisma = {
        $transaction: jest.fn((fn: (client: typeof tx) => Promise<number>) => fn(tx)),
    };
    return { prisma, tx, queryRaw, updateMany };
};

const run = async (byStep: LockedRow[][][]) => {
    const mocks = buildPrisma(byStep);
    const service = new BillingCronService(mocks.prisma as unknown as PrismaService, settings);
    await service.enforceSubscriptions();
    return mocks;
};

describe("BillingCronService — сроки подписок", () => {
    it("захватывает строки под блокировкой: SELECT ... FOR UPDATE SKIP LOCKED", async () => {
        const { queryRaw } = await run([]);

        expect(queryRaw).toHaveBeenCalledTimes(3);
        for (const [query] of queryRaw.mock.calls) {
            expect(sqlOf(query)).toContain("FOR UPDATE SKIP LOCKED");
        }
    });

    it("конец бесплатного периода переводит в past_due с льготным периодом", async () => {
        const before = Date.now();
        const { updateMany } = await run([[[{ id: "sub-trial" }]]]);

        expect(updateMany).toHaveBeenCalledTimes(1);
        const [{ where, data }] = updateMany.mock.calls[0];
        expect(where).toEqual({ id: { in: ["sub-trial"] } });
        expect(data.status).toBe(SubscriptionStatus.past_due);
        const graceMs = (data.graceEndsAt as Date).getTime() - before;
        expect(Math.round(graceMs / (24 * 60 * 60 * 1000))).toBe(GRACE_DAYS);
    });

    it("конец ручного срока — только у подписок provider = manual", async () => {
        const { queryRaw, updateMany } = await run([[], [[{ id: "sub-manual" }]]]);

        const manualQuery = queryRaw.mock.calls[1][0];
        expect(manualQuery.values).toContain("manual");
        expect(updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: { in: ["sub-manual"] } },
                data: expect.objectContaining({ status: SubscriptionStatus.past_due }),
            })
        );
    });

    it("конец льготного периода → expired, портал не гасится", async () => {
        const { tx, updateMany } = await run([[], [], [[{ id: "sub-1" }, { id: "sub-2" }]]]);

        expect(updateMany).toHaveBeenCalledWith({
            where: { id: { in: ["sub-1", "sub-2"] } },
            data: { status: SubscriptionStatus.expired },
        });
        // suspended отвечал 404 даже на вход — клиент не мог дойти до оплаты (TASK-512)
        expect(tx.portal.updateMany).not.toHaveBeenCalled();
    });

    it("ничего не пишет, когда переходить нечему", async () => {
        const { updateMany } = await run([]);

        expect(updateMany).not.toHaveBeenCalled();
    });
});
