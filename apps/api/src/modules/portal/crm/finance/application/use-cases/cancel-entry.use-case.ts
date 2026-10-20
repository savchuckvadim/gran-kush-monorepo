import { ConflictException, Injectable } from "@nestjs/common";

import { randomUUID } from "crypto";

import { employeeActor } from "@modules/events";

import { localDate, monthOf } from "../../domain/ledger/finance-period";
import { LEDGER_ERRORS, type LedgerEntry } from "../../domain/ledger/ledger-entry";
import { ClosedPeriodError } from "../../domain/ledger/ledger-errors";
import { reversalEntry } from "../../domain/ledger/ledger-reversal";
import { FinancePeriodRepository } from "../../domain/repositories/finance-period-repository.interface";
import { FinanceDirectory } from "../../domain/repositories/finance-sources.interface";
import { LedgerRepository } from "../../domain/repositories/ledger-repository.interface";
import { entryRecordedEvent, entryVoidedEvent } from "../events/ledger-events";
import { rethrowClosedPeriod } from "../ledger-errors";
import { assertLive, assertManual } from "../ledger-guards";
import { LedgerEntriesService, type LedgerEntryView } from "../services/ledger-entries.service";

export interface CancelledEntry {
    /** `voided` — проводка вышла из итогов; `reversed` — записано сторно в открытом месяце */
    mode: "voided" | "reversed";
    entry: LedgerEntryView;
}

/**
 * Отмена проводки.
 * - проводки заказа и сторно ведёт система: 409 `entry_managed_by_source` (отменяют заказ или
 *   оформляют возврат);
 * - отменённую и сторнированную второй раз не отменяют: 409;
 * - месяц открыт — проводка помечается отменённой и выходит из итогов;
 * - месяц закрыт (или закрылся по ходу) — сторно сегодняшним числом по часовому поясу клуба,
 *   исходная проводка остаётся как была.
 */
@Injectable()
export class CancelEntryUseCase {
    constructor(
        private readonly ledger: LedgerRepository,
        private readonly periods: FinancePeriodRepository,
        private readonly directory: FinanceDirectory,
        private readonly entries: LedgerEntriesService
    ) {}

    async execute(portalId: string, employeeId: string, id: string): Promise<CancelledEntry> {
        const entry = await this.entries.findOrFail(portalId, id);
        assertManual(entry);
        assertLive(entry);
        const period = await this.periods.find(portalId, monthOf(entry.occurredOn));
        if (!period?.closedAt) {
            const voided = await this.voidInOpenMonth(portalId, employeeId, entry);
            if (voided) return { mode: "voided", entry: await this.entries.get(portalId, id) };
        }
        return { mode: "reversed", entry: await this.reverse(portalId, employeeId, entry) };
    }

    /** `false` — месяц закрыли между проверкой и записью: остаётся сторно. */
    private async voidInOpenMonth(
        portalId: string,
        employeeId: string,
        entry: LedgerEntry
    ): Promise<boolean> {
        try {
            await this.ledger.markVoid(portalId, entry.id, employeeId, [
                entryVoidedEvent(portalId, entry.id, entry.occurredOn, employeeActor(employeeId)),
            ]);
            return true;
        } catch (error) {
            if (error instanceof ClosedPeriodError) return false;
            throw error;
        }
    }

    private async reverse(
        portalId: string,
        employeeId: string,
        entry: LedgerEntry
    ): Promise<LedgerEntryView> {
        const today = localDate(new Date(), await this.directory.timeZone(portalId));
        const reversal = reversalEntry(entry, randomUUID(), today, employeeId);
        const created = await this.ledger
            .create(portalId, [reversal], (count) =>
                count > 0 ? [entryRecordedEvent(portalId, reversal, employeeActor(employeeId))] : []
            )
            .catch(rethrowClosedPeriod);
        if (created === 0) {
            throw new ConflictException({
                message: "The entry is already reversed",
                code: LEDGER_ERRORS.alreadyReversed,
            });
        }
        return this.entries.get(portalId, reversal.id);
    }
}
