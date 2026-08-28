import { Injectable } from "@nestjs/common";

import { Payment, PaymentStatus, Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";

/** Клиент Prisma или его транзакционный срез — платёж пишется внутри транзакции обработки события. */
type PrismaClientLike = PrismaService | Prisma.TransactionClient;

export interface RecordProviderPaymentInput {
    portalId: string;
    /** Оба поля обязательны: без них строка не попадает под уникальный индекс и дедупликации не будет. */
    provider: string;
    externalId: string;
    amount: Prisma.Decimal | number | string;
    currency: string;
    status: PaymentStatus;
    paidAt?: Date | null;
}

@Injectable()
export class PaymentsService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Платёж, о котором сообщил провайдер. Идемпотентен по `(provider, externalId)`:
     * повторная доставка возвращает уже сохранённый платёж, а не создаёт второй и не падает в 500.
     *
     * Вставка идёт через `createMany({ skipDuplicates })` (`ON CONFLICT DO NOTHING`), а не через
     * `create` с перехватом `P2002`: в Postgres ошибка внутри транзакции переводит её в aborted,
     * и следующий запрос обработчика упал бы уже на «current transaction is aborted».
     *
     * Метод только создаёт. Перевод статуса вперёд по машине состояний — отдельная задача
     * (TASK-103): она требует compare-and-set и сверки суммы с заказом.
     */
    async recordProviderPayment(
        input: RecordProviderPaymentInput,
        client: PrismaClientLike = this.prisma
    ): Promise<Payment> {
        await client.payment.createMany({
            data: [
                {
                    portalId: input.portalId,
                    provider: input.provider,
                    externalId: input.externalId,
                    amount: new Prisma.Decimal(input.amount as Prisma.Decimal.Value),
                    currency: input.currency,
                    status: input.status,
                    paidAt: input.paidAt ?? null,
                },
            ],
            skipDuplicates: true,
        });

        const payment = await client.payment.findUnique({
            where: {
                provider_externalId: { provider: input.provider, externalId: input.externalId },
            },
        });
        if (!payment) {
            // Возможно только если строку удалили между вставкой и чтением — это уже не гонка
            // вебхуков, а вмешательство извне, и молчать о нём нельзя.
            throw new Error(
                `Payment ${input.provider}:${input.externalId} disappeared right after insert`
            );
        }
        return payment;
    }

    async findByExternalId(
        provider: string,
        externalId: string,
        client: PrismaClientLike = this.prisma
    ): Promise<Payment | null> {
        return client.payment.findUnique({
            where: { provider_externalId: { provider, externalId } },
        });
    }
}
