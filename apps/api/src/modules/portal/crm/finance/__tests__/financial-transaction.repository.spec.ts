import { PrismaService } from "@common/prisma/prisma.service";
import { FinancialTransactionPrismaRepository } from "@modules/portal/crm/finance/infrastructure/repositories/financial-transaction-prisma.repository";

const PORTAL_A = "portal-a";
const PORTAL_B = "portal-b";
const MEMBER_ID = "m-1";
const ORDER_ID = "o-1";

const txnRow = (over: Record<string, unknown> = {}) => ({
    id: "t-1",
    portalId: PORTAL_A,
    orderId: ORDER_ID,
    entityRecordId: "er-1",
    type: "order_payment",
    direction: "income",
    amount: { toString: () => "49.90" },
    currency: "EUR",
    paymentMethod: "cash",
    transactionDate: new Date("2026-08-28T10:00:00Z"),
    createdAt: new Date("2026-08-28T10:00:00Z"),
    createdBy: null,
    description: null,
    notes: null,
    sourceType: "order_payment",
    sourceId: ORDER_ID,
    entityRecord: null,
    order: null,
    createdByEmployee: null,
    ...over,
});

const build = () => {
    const prisma = {
        financialTransaction: {
            findFirst: jest.fn().mockResolvedValue(txnRow()),
            findMany: jest.fn().mockResolvedValue([]),
            count: jest.fn().mockResolvedValue(0),
            create: jest.fn().mockResolvedValue(txnRow()),
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
            aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
            groupBy: jest.fn().mockResolvedValue([]),
        },
        member: { findFirst: jest.fn().mockResolvedValue({ entityRecordId: "er-1" }) },
        order: { findFirst: jest.fn().mockResolvedValue({ id: ORDER_ID }) },
        $queryRaw: jest.fn().mockResolvedValue([]),
    };
    return {
        prisma,
        repo: new FinancialTransactionPrismaRepository(prisma as unknown as PrismaService),
    };
};

describe("FinancialTransactionPrismaRepository — скоуп портала", () => {
    it("список без фильтров всё равно ограничен порталом", async () => {
        const { prisma, repo } = build();

        await repo.findAll(PORTAL_A);

        expect(prisma.financialTransaction.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { portalId: PORTAL_A } })
        );
    });

    it("список с фильтрами не теряет портал", async () => {
        const { prisma, repo } = build();

        await repo.findAll(PORTAL_A, { type: "order_payment" });

        expect(prisma.financialTransaction.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ portalId: PORTAL_A, type: "order_payment" }),
            })
        );
    });

    it("подсчёт ограничен порталом", async () => {
        const { prisma, repo } = build();

        await repo.count(PORTAL_A);

        expect(prisma.financialTransaction.count).toHaveBeenCalledWith({
            where: { portalId: PORTAL_A },
        });
    });

    it("выборка по id ищет только внутри портала", async () => {
        const { prisma, repo } = build();

        await repo.findByIdForPortal("t-1", PORTAL_A);

        expect(prisma.financialTransaction.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: "t-1", portalId: PORTAL_A } })
        );
    });

    it("сводка ограничена порталом", async () => {
        const { prisma, repo } = build();

        await repo.getSummary(PORTAL_A);

        expect(prisma.financialTransaction.count).toHaveBeenCalledWith({
            where: { portalId: PORTAL_A },
        });
    });

    it("сводка по участнику из чужого портала пустая, а не «по всему порталу»", async () => {
        const { prisma, repo } = build();
        prisma.member.findFirst.mockResolvedValue(null);

        await repo.getSummary(PORTAL_A, undefined, undefined, MEMBER_ID);

        expect(prisma.financialTransaction.count).toHaveBeenCalledWith({
            where: expect.objectContaining({
                portalId: PORTAL_A,
                entityRecordId: "__no_such_entity_record__",
            }),
        });
    });

    it("группировка по дате фильтрует по порталу в самом SQL", async () => {
        const { prisma, repo } = build();

        await repo.getGroupedByDate(PORTAL_A, new Date("2026-08-01"), new Date("2026-08-31"));

        const sqlParts = (prisma.$queryRaw.mock.calls[0] as unknown[])[0] as string[];
        expect(sqlParts.join("?")).toContain("portal_id =");
    });
});

describe("FinancialTransactionPrismaRepository — запись только в свой портал", () => {
    it("отклоняет участника чужого портала вместо создания проводки у соседа", async () => {
        const { prisma, repo } = build();
        prisma.member.findFirst.mockResolvedValue(null);

        await expect(
            repo.create({
                portalId: PORTAL_A,
                memberId: MEMBER_ID,
                type: "adjustment",
                direction: "income",
                amount: 10,
            })
        ).rejects.toThrow(/does not belong to portal/);

        expect(prisma.financialTransaction.create).not.toHaveBeenCalled();
    });

    it("отклоняет заказ чужого портала", async () => {
        const { prisma, repo } = build();
        prisma.order.findFirst.mockResolvedValue(null);

        await expect(
            repo.create({
                portalId: PORTAL_A,
                orderId: ORDER_ID,
                type: "order_payment",
                direction: "income",
                amount: 10,
            })
        ).rejects.toThrow(/does not belong to portal/);
    });
});

describe("FinancialTransactionPrismaRepository — идемпотентность по источнику", () => {
    const sourced = {
        portalId: PORTAL_A,
        orderId: ORDER_ID,
        memberId: MEMBER_ID,
        type: "order_payment",
        direction: "income",
        amount: 49.9,
        currency: "EUR",
        source: { type: "order_payment", id: ORDER_ID },
    };

    it("пишет через ON CONFLICT DO NOTHING, а не через create с перехватом ошибки", async () => {
        const { prisma, repo } = build();

        await repo.createFromSource(sourced);

        expect(prisma.financialTransaction.createMany).toHaveBeenCalledWith(
            expect.objectContaining({ skipDuplicates: true })
        );
        expect(prisma.financialTransaction.create).not.toHaveBeenCalled();
    });

    it("повтор по тому же источнику возвращает существующую проводку", async () => {
        const { prisma, repo } = build();
        prisma.financialTransaction.createMany.mockResolvedValue({ count: 0 });

        const txn = await repo.createFromSource(sourced);

        expect(txn.id).toBe("t-1");
        expect(prisma.financialTransaction.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    sourceType: "order_payment",
                    sourceId: ORDER_ID,
                    portalId: PORTAL_A,
                }),
            })
        );
    });

    it("источник, занятый другим порталом, не проглатывается молча", async () => {
        const { prisma, repo } = build();
        prisma.financialTransaction.createMany.mockResolvedValue({ count: 0 });
        prisma.financialTransaction.findFirst.mockResolvedValue(null);

        await expect(repo.createFromSource({ ...sourced, portalId: PORTAL_B })).rejects.toThrow(
            /belongs to another portal/
        );
    });
});
