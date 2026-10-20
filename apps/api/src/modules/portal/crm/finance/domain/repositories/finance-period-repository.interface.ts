import type { NewDomainEvent } from "@modules/events";

import type { FinanceMonth, FinancePeriodState } from "../ledger/finance-period";

/** Месяц с проведёнными проводками: сколько их. */
export interface MonthActivity extends FinanceMonth {
    entryCount: number;
}

/** Закрытие месяцев. Закрытие ждёт записи проводок этого месяца и наоборот (блокировка месяца). */
export abstract class FinancePeriodRepository {
    abstract list(portalId: string): Promise<FinancePeriodState[]>;

    abstract activity(portalId: string): Promise<MonthActivity[]>;

    abstract find(portalId: string, month: FinanceMonth): Promise<FinancePeriodState | null>;

    /** `false` — месяц уже закрыт. */
    abstract close(
        portalId: string,
        month: FinanceMonth,
        employeeId: string,
        events: readonly NewDomainEvent[]
    ): Promise<boolean>;

    /** `false` — месяц не был закрыт. */
    abstract reopen(
        portalId: string,
        month: FinanceMonth,
        events: readonly NewDomainEvent[]
    ): Promise<boolean>;
}
