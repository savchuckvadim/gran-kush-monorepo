import { PaymentStatus, Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { PaymentsService } from "@modules/billing/application/services/payments.service";

const PORTAL_ID = "p-1";
const PROVIDER = "acme";
const EXTERNAL_ID = "evt_pay_1";

const paymentRow = (over: Record<string, unknown> = {}) => ({
    id: "pay-1",
    portalId: PORTAL_ID,
    amount: new Prisma.Decimal("49.90"),
    currency: "EUR",
    status: PaymentStatus.succeeded,
    provider: PROVIDER,
    externalId: EXTERNAL_ID,
    paidAt: new Date("2026-08-28T10:00:00Z"),
    createdAt: new Date("2026-08-28T10:00:00Z"),
    updatedAt: new Date("2026-08-28T10:00:00Z"),
    ...over,
});

const input = {
    portalId: PORTAL_ID,
    provider: PROVIDER,
    externalId: EXTERNAL_ID,
    amount: "49.90",
    currency: "EUR",
    status: PaymentStatus.succeeded,
    paidAt: new Date("2026-08-28T10:00:00Z"),
};

describe("PaymentsService — идемпотентность платежа провайдера", () => {
    const build = () => {
        const prisma = {
            payment: {
                createMany: jest.fn().mockResolvedValue({ count: 1 }),
                findUnique: jest.fn().mockResolvedValue(paymentRow()),
            },
        };
        return {
            prisma,
            service: new PaymentsService(prisma as unknown as PrismaService),
        };
    };

    it("вставляет платёж через ON CONFLICT DO NOTHING, а не через create с перехватом ошибки", async () => {
        const { prisma, service } = build();

        await service.recordProviderPayment(input);

        expect(prisma.payment.createMany).toHaveBeenCalledWith(
            expect.objectContaining({ skipDuplicates: true })
        );
        // На моке нет payment.create — обращение к нему уронило бы тест.
        // Это и есть проверка: create бросил бы P2002 и оставил транзакцию в aborted-состоянии.
    });

    it("повторная доставка того же externalId возвращает сохранённый платёж, а не создаёт второй", async () => {
        const { prisma, service } = build();
        prisma.payment.createMany.mockResolvedValue({ count: 0 });

        const result = await service.recordProviderPayment(input);

        expect(result.id).toBe("pay-1");
        expect(prisma.payment.findUnique).toHaveBeenCalledWith({
            where: { provider_externalId: { provider: PROVIDER, externalId: EXTERNAL_ID } },
        });
    });

    it("не глотает исчезновение строки между вставкой и чтением", async () => {
        const { prisma, service } = build();
        prisma.payment.findUnique.mockResolvedValue(null);

        await expect(service.recordProviderPayment(input)).rejects.toThrow(
            /disappeared right after insert/
        );
    });

    it("пишет платёж в переданный транзакционный клиент, а не мимо транзакции", async () => {
        const { prisma, service } = build();
        const tx = {
            payment: {
                createMany: jest.fn().mockResolvedValue({ count: 1 }),
                findUnique: jest.fn().mockResolvedValue(paymentRow()),
            },
        };

        await service.recordProviderPayment(input, tx as unknown as Prisma.TransactionClient);

        expect(tx.payment.createMany).toHaveBeenCalled();
        expect(prisma.payment.createMany).not.toHaveBeenCalled();
    });
});
