import { Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { BillingPlanPrismaRepository } from "@modules/billing/infrastructure/repositories/billing-plan-prisma.repository";

const planRow = (over: Record<string, unknown> = {}) => ({
    code: "club-month",
    name: "Club",
    priceAmount: new Prisma.Decimal("49"),
    currency: "EUR",
    interval: "month",
    featuresJson: { crm: true, sites: true, messenger: false },
    ...over,
});

describe("BillingPlanPrismaRepository — публичный каталог тарифов", () => {
    const build = (rows: unknown[] = [planRow()]) => {
        const prisma = {
            billingPlan: {
                findMany: jest.fn().mockResolvedValue(rows),
            },
        };
        return {
            prisma,
            repo: new BillingPlanPrismaRepository(prisma as unknown as PrismaService),
        };
    };

    it("берёт только активные тарифы по возрастанию цены, при равной цене — по коду", async () => {
        const { prisma, repo } = build();

        await repo.findActivePlansForCatalog();

        expect(prisma.billingPlan.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { isActive: true, isPublic: true },
                orderBy: [{ priceAmount: "asc" }, { code: "asc" }],
            })
        );
    });

    it("отдаёт каталожные поля и флаги возможностей", async () => {
        const { repo } = build();

        await expect(repo.findActivePlansForCatalog()).resolves.toEqual([
            {
                code: "club-month",
                name: "Club",
                priceAmount: "49.00",
                currency: "EUR",
                interval: "month",
                features: { crm: true, sites: true, messenger: false },
            },
        ]);
    });

    it("цена — строка ровно с двумя знаками после точки", async () => {
        const { repo } = build([
            planRow({ code: "trial", priceAmount: new Prisma.Decimal("0") }),
            planRow({ code: "barrio-year", priceAmount: new Prisma.Decimal("239.9") }),
            planRow({ code: "club-month", priceAmount: new Prisma.Decimal("49") }),
        ]);

        const plans = await repo.findActivePlansForCatalog();

        expect(plans.map((p) => p.priceAmount)).toEqual(["0.00", "239.90", "49.00"]);
    });

    it("сумма не проходит через float", async () => {
        // 19 значащих цифр: через Number хвост превратился бы в «…568.00».
        const { repo } = build([
            planRow({ priceAmount: new Prisma.Decimal("12345678901234567.89") }),
        ]);

        const [plan] = await repo.findActivePlansForCatalog();

        expect(plan.priceAmount).toBe("12345678901234567.89");
    });

    it("отбрасывает из featuresJson всё, что не булев флаг", async () => {
        const { repo } = build([
            planRow({
                featuresJson: { crm: true, seats: 5, note: "x", nested: { a: true }, sms: false },
            }),
        ]);

        const [plan] = await repo.findActivePlansForCatalog();

        expect(plan.features).toEqual({ crm: true, sms: false });
    });

    it.each([[["crm", "sites"]], [null], ["crm"], [42]])(
        "featuresJson не объект (%j) — пустой набор флагов, а не падение каталога",
        async (featuresJson) => {
            const { repo } = build([planRow({ featuresJson })]);

            const [plan] = await repo.findActivePlansForCatalog();

            expect(plan.features).toEqual({});
        }
    );
});
