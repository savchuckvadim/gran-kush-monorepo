import { Injectable } from "@nestjs/common";

import { FinanceDirectory } from "@modules/portal/crm/finance/domain/repositories/finance-sources.interface";

import { type MarginReport, marginReport } from "../../domain/margin";
import { SoldLinesSource } from "../../domain/sold-lines.source";

/** Отчёт по марже за календарный период клуба (даты включительно, по часовому поясу клуба). */
@Injectable()
export class MarginService {
    constructor(
        private readonly sold: SoldLinesSource,
        private readonly directory: FinanceDirectory
    ) {}

    async report(portalId: string, from: string, to: string): Promise<MarginReport> {
        const timeZone = await this.directory.timeZone(portalId);
        const lines = await this.sold.soldBetween(
            portalId,
            startOfDay(from, timeZone),
            endOfDay(to, timeZone)
        );
        return marginReport(lines);
    }
}

/** Смещение пояса для даты: разница между «той же стенкой часов» в UTC и в поясе. */
const offsetMs = (at: Date, timeZone: string): number => {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).formatToParts(at);
    const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
    const wall = Date.UTC(
        value("year"),
        value("month") - 1,
        value("day"),
        value("hour"),
        value("minute"),
        value("second")
    );
    return wall - at.getTime();
};

/** Полночь календарной даты в поясе клуба как момент UTC. */
export const startOfDay = (date: string, timeZone: string): Date => {
    const guess = new Date(`${date}T00:00:00.000Z`);
    return new Date(guess.getTime() - offsetMs(guess, timeZone));
};

export const endOfDay = (date: string, timeZone: string): Date => {
    const nextDay = new Date(`${date}T00:00:00.000Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    return new Date(startOfDay(nextDay.toISOString().slice(0, 10), timeZone).getTime() - 1);
};
