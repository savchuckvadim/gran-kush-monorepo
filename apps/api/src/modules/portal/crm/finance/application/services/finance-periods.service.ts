import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";

import { employeeActor } from "@modules/events";

import {
    type FinanceMonth,
    isPastMonth,
    localDate,
    monthKey,
    monthOf,
    PERIOD_ERRORS,
} from "../../domain/ledger/finance-period";
import { FinancePeriodRepository } from "../../domain/repositories/finance-period-repository.interface";
import { FinanceDirectory } from "../../domain/repositories/finance-sources.interface";
import { periodClosedEvent, periodReopenedEvent } from "../events/ledger-events";

export interface FinancePeriodView extends FinanceMonth {
    entryCount: number;
    closedAt: Date | null;
    closedByName: string | null;
    /** Прошедший открытый месяц: его можно закрыть */
    closable: boolean;
}

/**
 * Месяцы учёта: с проводками, закрытые и текущий. Закрыть можно только прошедший месяц — в
 * текущий ложатся автопроводки и сторно; открыть закрытый снова — `finance.admin`.
 */
@Injectable()
export class FinancePeriodsService {
    constructor(
        private readonly repository: FinancePeriodRepository,
        private readonly directory: FinanceDirectory
    ) {}

    async list(portalId: string): Promise<FinancePeriodView[]> {
        const [activity, periods, today] = await Promise.all([
            this.repository.activity(portalId),
            this.repository.list(portalId),
            this.today(portalId),
        ]);
        const months = new Map<string, FinancePeriodView>();
        const add = (month: FinanceMonth): FinancePeriodView => {
            const key = monthKey(month);
            const view = months.get(key) ?? {
                year: month.year,
                month: month.month,
                entryCount: 0,
                closedAt: null,
                closedByName: null,
                closable: false,
            };
            months.set(key, view);
            return view;
        };
        add(monthOf(today));
        for (const item of activity) add(item).entryCount = item.entryCount;
        for (const period of periods) add(period).closedAt = period.closedAt;
        const closers = await this.directory.employeeNames(
            portalId,
            periods.flatMap((period) => (period.closedById ? [period.closedById] : []))
        );
        for (const period of periods) {
            const view = add(period);
            view.closedByName = period.closedById ? (closers.get(period.closedById) ?? null) : null;
        }
        for (const view of months.values())
            view.closable = !view.closedAt && isPastMonth(view, today);
        return [...months.values()].sort((a, b) => monthKey(b).localeCompare(monthKey(a)));
    }

    async close(portalId: string, month: FinanceMonth, employeeId: string): Promise<void> {
        if (!isPastMonth(month, await this.today(portalId))) {
            throw new BadRequestException({
                message: "Only a past month can be closed",
                code: PERIOD_ERRORS.notPast,
            });
        }
        const closed = await this.repository.close(portalId, month, employeeId, [
            periodClosedEvent(portalId, month, employeeActor(employeeId)),
        ]);
        if (!closed) {
            throw new ConflictException({
                message: "The month is already closed",
                code: PERIOD_ERRORS.alreadyClosed,
            });
        }
    }

    async reopen(portalId: string, month: FinanceMonth, employeeId: string): Promise<void> {
        const reopened = await this.repository.reopen(portalId, month, [
            periodReopenedEvent(portalId, month, employeeActor(employeeId)),
        ]);
        if (!reopened) {
            throw new ConflictException({
                message: "The month is not closed",
                code: PERIOD_ERRORS.notClosed,
            });
        }
    }

    private async today(portalId: string): Promise<string> {
        return localDate(new Date(), await this.directory.timeZone(portalId));
    }
}
