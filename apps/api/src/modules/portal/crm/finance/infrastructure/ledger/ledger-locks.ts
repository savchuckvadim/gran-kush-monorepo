import type { OutboxTransaction } from "@modules/events";

import { type FinanceMonth, monthKey } from "../../domain/ledger/finance-period";
import { ClosedPeriodError } from "../../domain/ledger/ledger-errors";

/**
 * Блокировки учёта — advisory-блокировки Postgres до конца транзакции. Запись проводок берёт
 * месяц разделяемо, закрытие месяца — исключительно: закрытие ждёт идущие записи, а запись после
 * закрытия видит его и отказывает. Строк для блокировки не нужно — месяц без строки тоже
 * блокируется.
 */
const monthLockKey = (portalId: string, month: FinanceMonth) =>
    `ledger:period:${portalId}:${monthKey(month)}`;

const uniqueMonths = (months: readonly FinanceMonth[]): FinanceMonth[] =>
    [...new Map(months.map((month) => [monthKey(month), month])).values()].sort((a, b) =>
        monthKey(a).localeCompare(monthKey(b))
    );

/** Месяцы открыты и не закроются до конца транзакции; закрытый — `ClosedPeriodError`. */
export const holdOpenMonths = async (
    tx: OutboxTransaction,
    portalId: string,
    months: readonly FinanceMonth[]
): Promise<void> => {
    const list = uniqueMonths(months);
    // по порядку месяцев: две записи с одинаковыми месяцами не ждут друг друга по кругу
    for (const month of list) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock_shared(hashtextextended(${monthLockKey(portalId, month)}, 0))`;
    }
    if (list.length === 0) return;
    const closed = await tx.financePeriod.findFirst({
        where: {
            portalId,
            closedAt: { not: null },
            OR: list.map((month) => ({ year: month.year, month: month.month })),
        },
        select: { year: true, month: true },
    });
    if (closed) throw new ClosedPeriodError(monthKey(closed));
};

/** Исключительная блокировка месяца — для закрытия и открытия. */
export const lockMonth = async (
    tx: OutboxTransaction,
    portalId: string,
    month: FinanceMonth
): Promise<void> => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${monthLockKey(portalId, month)}, 0))`;
};

/** События одного заказа сверяются с учётом по очереди. */
export const lockOrderLedger = async (tx: OutboxTransaction, orderId: string): Promise<void> => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`ledger:order:${orderId}`}, 0))`;
};
