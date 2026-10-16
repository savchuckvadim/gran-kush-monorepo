import { Prisma, StageSemantic } from "@prisma/client";

import { MonthlyLimitExceededError } from "@modules/portal/crm/orders/domain/errors/monthly-limit-exceeded.error";
import { roundGrams } from "@modules/portal/crm/orders/domain/monthly-limit";

type Db = Prisma.TransactionClient;

/**
 * Позиции, которые занимают лимит участника: его заказы с `since` и не отменённые. Отмену
 * узнаём по стадии записи заказа — как и везде (`order-stage.rules.ts`).
 */
const usageWhere = (memberId: string, since: Date): Prisma.OrderItemWhereInput => ({
    order: {
        memberId,
        orderedAt: { gte: since },
        NOT: {
            entityRecord: {
                stage: { OR: [{ semantic: StageSemantic.FAILURE }, { isTerminalFailure: true }] },
            },
        },
    },
});

/** Сколько граммов лимита участник занял с `since`. */
export const sumLimitUsage = async (db: Db, memberId: string, since: Date): Promise<number> => {
    const { _sum } = await db.orderItem.aggregate({
        where: usageWhere(memberId, since),
        _sum: { limitGrams: true },
    });
    return roundGrams(Number(_sum.limitGrams ?? 0));
};

/**
 * Проверка лимита внутри транзакции заказа. Строка участника блокируется до конца транзакции:
 * два параллельных заказа одного участника считают отпущенное по очереди и не проходят оба,
 * когда вместе превышают лимит. Превышение откатывает весь заказ вместе со складом.
 */
export const enforceMonthlyLimit = async (
    tx: Db,
    input: { memberId: string; limitGrams: number; addingGrams: number; since: Date }
): Promise<void> => {
    if (input.addingGrams <= 0) return;
    await tx.$queryRaw`SELECT id FROM members WHERE id = ${input.memberId} FOR UPDATE`;
    const used = await sumLimitUsage(tx, input.memberId, input.since);
    if (roundGrams(used + input.addingGrams) > input.limitGrams) {
        throw new MonthlyLimitExceededError(Math.max(0, roundGrams(input.limitGrams - used)));
    }
};
