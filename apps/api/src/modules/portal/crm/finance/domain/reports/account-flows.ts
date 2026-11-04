import { FinanceAccount } from "@prisma/client";

import type { LedgerEntry } from "../ledger/ledger-entry";
import { accountMovements } from "../ledger/ledger-summary";

/** Касса и банк за период в центах: остаток на начало, приход, расход, остаток на конец. */
export interface AccountFlow {
    account: FinanceAccount;
    opening: number;
    inflow: number;
    outflow: number;
    closing: number;
}

/**
 * Движение по счетам. `entries` — все проведённые проводки до конца периода: остаток на начало
 * складывается из тех, что раньше `from`. Сторно с минусом уменьшает приход (или расход), а не
 * попадает в противоположную колонку: отменённая продажа — не расход кассы.
 */
export const accountFlows = (entries: readonly LedgerEntry[], from: string): AccountFlow[] => {
    const flows = new Map<FinanceAccount, AccountFlow>(
        Object.values(FinanceAccount).map((account) => [
            account,
            { account, opening: 0, inflow: 0, outflow: 0, closing: 0 },
        ])
    );
    for (const entry of entries) {
        const before = entry.occurredOn < from;
        const reversal = entry.reversalOfId !== null;
        for (const { account, cents } of accountMovements(entry)) {
            const flow = flows.get(account);
            if (!flow) continue;
            flow.closing += cents;
            if (before) flow.opening += cents;
            else if (reversal ? cents < 0 : cents > 0) flow.inflow += cents;
            else flow.outflow -= cents;
        }
    }
    return [...flows.values()];
};
