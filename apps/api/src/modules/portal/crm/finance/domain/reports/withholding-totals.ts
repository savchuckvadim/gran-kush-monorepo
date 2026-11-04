import { LedgerDirection } from "@prisma/client";

import { type LedgerEntry, totalsOf } from "../ledger/ledger-entry";

/** Удержания IRPF одной стороны в центах: база документов с удержанием и сумма удержания. */
export interface WithholdingSide {
    base: number;
    amount: number;
    count: number;
    /** Разных контрагентов — для формы 111 это число perceptores */
    counterparties: number;
}

/**
 * Удержания периода: `received` — клиенты удержали с наших доходов (зачёт в 130/200),
 * `applied` — мы удержали с профессионалов и обязаны перечислить (форма 111).
 */
export interface WithholdingTotals {
    received: WithholdingSide;
    applied: WithholdingSide;
}

const sideOf = (entries: readonly LedgerEntry[]): WithholdingSide => {
    const withheld = entries.filter((entry) => entry.secret.withholding);
    const counterparties = new Set(
        withheld.flatMap((entry) => (entry.counterpartyId ? [entry.counterpartyId] : []))
    );
    return {
        base: withheld.reduce((sum, entry) => sum + totalsOf(entry.secret).net, 0),
        amount: withheld.reduce((sum, entry) => sum + (entry.secret.withholding?.amount ?? 0), 0),
        count: withheld.length,
        counterparties: counterparties.size,
    };
};

export const withholdingTotals = (entries: readonly LedgerEntry[]): WithholdingTotals => ({
    received: sideOf(entries.filter((entry) => entry.direction === LedgerDirection.income)),
    applied: sideOf(entries.filter((entry) => entry.direction === LedgerDirection.expense)),
});
