import { Injectable } from "@nestjs/common";

import { randomUUID } from "crypto";

import { employeeActor } from "@modules/events";

import { LEDGER_SOURCES } from "../../domain/ledger/ledger-entry";
import {
    LedgerRepository,
    type NewLedgerEntry,
} from "../../domain/repositories/ledger-repository.interface";
import { LEDGER_CURRENCY } from "../../finance.limits";
import { entryRecordedEvent } from "../events/ledger-events";
import { rethrowClosedPeriod } from "../ledger-errors";
import { assertNotDuplicate } from "../ledger-guards";
import { LedgerEntriesService, type LedgerEntryView } from "../services/ledger-entries.service";
import { type EntryInput, LedgerEntryInputService } from "../services/ledger-entry-input.service";

/**
 * Ручная проводка: доход, расход или перевод между счетами.
 * - статья — своего направления и не в архиве; у перевода статьи и налога нет, счета разные;
 * - налог — выбранная ставка клуба или ставка по умолчанию (статья вне налога, расход — общая);
 * - контрагент — свой или участник клуба; удержание IRPF считается с базы;
 * - тот же контрагент и номер документа уже проведены — 409 `duplicate_document`, пока человек
 *   не подтвердит `allowDuplicate`;
 * - месяц закрыт — 409 `period_closed`.
 */
@Injectable()
export class RecordEntryUseCase {
    constructor(
        private readonly input: LedgerEntryInputService,
        private readonly ledger: LedgerRepository,
        private readonly entries: LedgerEntriesService
    ) {}

    async execute(
        portalId: string,
        employeeId: string,
        input: EntryInput,
        allowDuplicate: boolean
    ): Promise<LedgerEntryView> {
        const resolved = await this.input.resolve(portalId, input);
        await assertNotDuplicate(this.ledger, portalId, resolved, null, allowDuplicate);
        const entry: NewLedgerEntry = {
            ...resolved,
            id: randomUUID(),
            currency: LEDGER_CURRENCY,
            sourceType: LEDGER_SOURCES.manual,
            sourceId: null,
            reversalOfId: null,
            createdById: employeeId,
        };
        await this.ledger
            .create(portalId, [entry], () => [
                entryRecordedEvent(portalId, entry, employeeActor(employeeId)),
            ])
            .catch(rethrowClosedPeriod);
        return this.entries.get(portalId, entry.id);
    }
}
