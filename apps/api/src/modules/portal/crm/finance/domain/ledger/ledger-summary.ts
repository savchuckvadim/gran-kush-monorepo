import { FinanceAccount, LedgerDirection } from "@prisma/client";

import type { CategoryDirection } from "./finance-category";
import { type LedgerEntry, totalsOf } from "./ledger-entry";

/** Итоги направления в центах; сторно входит со своим знаком. */
export interface DirectionTotals {
    net: number;
    tax: number;
    total: number;
    withholding: number;
    payable: number;
    count: number;
}

export interface CategoryTotals {
    categoryId: string;
    direction: CategoryDirection;
    net: number;
    total: number;
    count: number;
}

export interface LedgerSummary {
    income: DirectionTotals;
    expense: DirectionTotals;
    /** Результат периода: доходы минус расходы по базе — налог не доход и не расход */
    result: number;
    byCategory: CategoryTotals[];
}

const empty = (): DirectionTotals => ({
    net: 0,
    tax: 0,
    total: 0,
    withholding: 0,
    payable: 0,
    count: 0,
});

const add = (sum: DirectionTotals, entry: LedgerEntry): void => {
    const totals = totalsOf(entry.secret);
    sum.net += totals.net;
    sum.tax += totals.tax;
    sum.total += totals.total;
    sum.withholding += totals.withholding;
    sum.payable += totals.payable;
    sum.count += 1;
};

/** Сводка проведённых проводок периода: по направлениям и по статьям (крупные сверху). */
export const summarize = (entries: readonly LedgerEntry[]): LedgerSummary => {
    const income = empty();
    const expense = empty();
    const categories = new Map<string, CategoryTotals>();
    for (const entry of entries) {
        if (entry.direction === LedgerDirection.transfer) continue;
        const direction: CategoryDirection =
            entry.direction === LedgerDirection.income ? "income" : "expense";
        add(direction === "income" ? income : expense, entry);
        if (!entry.categoryId) continue;
        const totals = totalsOf(entry.secret);
        const row = categories.get(entry.categoryId) ?? {
            categoryId: entry.categoryId,
            direction,
            net: 0,
            total: 0,
            count: 0,
        };
        row.net += totals.net;
        row.total += totals.total;
        row.count += 1;
        categories.set(entry.categoryId, row);
    }
    const byCategory = [...categories.values()].sort(
        (a, b) => Math.abs(b.total) - Math.abs(a.total)
    );
    return { income, expense, result: income.net - expense.net, byCategory };
};

/**
 * Остатки счетов по проводкам: доход приходит на счёт суммой к получению (за вычетом IRPF),
 * расход уходит суммой к оплате, перевод уходит со счёта и приходит на другой.
 */
export const accountBalances = (entries: readonly LedgerEntry[]): Map<FinanceAccount, number> => {
    const balances = new Map<FinanceAccount, number>(
        Object.values(FinanceAccount).map((account) => [account, 0])
    );
    const move = (account: FinanceAccount, cents: number) =>
        balances.set(account, (balances.get(account) ?? 0) + cents);
    for (const entry of entries) {
        const { payable, net } = totalsOf(entry.secret);
        if (entry.direction === LedgerDirection.income) move(entry.account, payable);
        else if (entry.direction === LedgerDirection.expense) move(entry.account, -payable);
        else {
            move(entry.account, -net);
            if (entry.toAccount) move(entry.toAccount, net);
        }
    }
    return balances;
};
