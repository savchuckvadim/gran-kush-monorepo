import { ConflictException } from "@nestjs/common";

import { LEDGER_ERRORS } from "../domain/ledger/ledger-entry";
import { ClosedPeriodError } from "../domain/ledger/ledger-errors";

/** Закрытый месяц → 409 `period_closed` с месяцем: CRM предложит сторно в открытом месяце. */
export const rethrowClosedPeriod = (error: unknown): never => {
    if (error instanceof ClosedPeriodError) {
        throw new ConflictException({
            message: `Finance period ${error.period} is closed`,
            code: LEDGER_ERRORS.periodClosed,
            period: error.period,
        });
    }
    throw error;
};
