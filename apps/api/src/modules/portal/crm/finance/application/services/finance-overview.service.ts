import { Injectable } from "@nestjs/common";

import type { FinanceAccount } from "@prisma/client";

import { accountBalances, type LedgerSummary, summarize } from "../../domain/ledger/ledger-summary";
import { LedgerRepository } from "../../domain/repositories/ledger-repository.interface";

export interface FinanceOverview extends LedgerSummary {
    from: string;
    to: string;
    /** Остаток счёта на конец периода — по всем проводкам до `to` */
    accounts: { account: FinanceAccount; balance: number }[];
}

/** Обзор учёта: доходы, расходы и результат периода, статьи, остатки кассы и банка. */
@Injectable()
export class FinanceOverviewService {
    constructor(private readonly ledger: LedgerRepository) {}

    async overview(portalId: string, from: string, to: string): Promise<FinanceOverview> {
        const entries = await this.ledger.listAll(portalId, { to, includeVoid: false });
        const inPeriod = entries.filter((entry) => entry.occurredOn >= from);
        const balances = accountBalances(entries);
        return {
            from,
            to,
            ...summarize(inPeriod),
            accounts: [...balances].map(([account, balance]) => ({ account, balance })),
        };
    }
}
