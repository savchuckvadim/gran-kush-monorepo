import { PortalStatus, SubscriptionStatus } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { BillingCronService } from "@modules/cron/services/billing-cron.service";

type LockedRow = { id: string; portal_id: string };

/** То, что Prisma.sql передаёт в $queryRaw: нас интересует только текст запроса. */
type RawQuery = { sql?: string; strings?: string[] };

const buildPrisma = (batches: LockedRow[][]) => {
    const queryRaw = jest.fn<Promise<LockedRow[]>, [RawQuery]>();
    for (const batch of batches) queryRaw.mockResolvedValueOnce(batch);
    queryRaw.mockResolvedValue([]);

    const tx = {
        $queryRaw: queryRaw,
        portalSubscription: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
        portal: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };

    const prisma = {
        $transaction: jest.fn((fn: (client: typeof tx) => Promise<number>) => fn(tx)),
    };

    return { prisma, tx, queryRaw };
};

describe("BillingCronService — истечение grace-периода", () => {
    it("захватывает строки под блокировкой и гасит порталы одной пачкой", async () => {
        const { prisma, tx, queryRaw } = buildPrisma([
            [
                { id: "sub-1", portal_id: "portal-1" },
                { id: "sub-2", portal_id: "portal-2" },
            ],
        ]);
        const service = new BillingCronService(prisma as unknown as PrismaService);

        await service.enforceSubscriptionGrace();

        const query = queryRaw.mock.calls[0][0];
        const sql = query.sql ?? (query.strings ?? []).join("");
        expect(sql).toContain("FOR UPDATE SKIP LOCKED");

        expect(tx.portalSubscription.updateMany).toHaveBeenCalledWith({
            where: { id: { in: ["sub-1", "sub-2"] } },
            data: { status: SubscriptionStatus.expired },
        });
        expect(tx.portal.updateMany).toHaveBeenCalledWith({
            where: { id: { in: ["portal-1", "portal-2"] } },
            data: { status: PortalStatus.suspended },
        });
    });

    it("ничего не пишет, когда просроченных подписок нет", async () => {
        const { prisma, tx } = buildPrisma([[]]);
        const service = new BillingCronService(prisma as unknown as PrismaService);

        await service.enforceSubscriptionGrace();

        expect(tx.portalSubscription.updateMany).not.toHaveBeenCalled();
        expect(tx.portal.updateMany).not.toHaveBeenCalled();
    });

    it("не держит блокировку на всех строках сразу: неполная пачка завершает обход", async () => {
        const { prisma, queryRaw } = buildPrisma([[{ id: "sub-1", portal_id: "portal-1" }]]);
        const service = new BillingCronService(prisma as unknown as PrismaService);

        await service.enforceSubscriptionGrace();

        // Пачка меньше лимита — значит просроченных больше нет и второй заход не нужен.
        expect(queryRaw).toHaveBeenCalledTimes(1);
    });
});
