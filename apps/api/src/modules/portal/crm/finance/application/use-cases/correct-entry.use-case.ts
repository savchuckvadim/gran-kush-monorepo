import { Injectable } from "@nestjs/common";

import { employeeActor } from "@modules/events";

import { LedgerRepository } from "../../domain/repositories/ledger-repository.interface";
import { entryUpdatedEvent } from "../events/ledger-events";
import { rethrowClosedPeriod } from "../ledger-errors";
import { assertLive, assertManual, assertNotDuplicate } from "../ledger-guards";
import { LedgerEntriesService, type LedgerEntryView } from "../services/ledger-entries.service";
import { type EntryInput, LedgerEntryInputService } from "../services/ledger-entry-input.service";

/**
 * Правка ручной или импортированной проводки целиком — те же проверки, что при записи.
 * - проводки заказа и сторно ведёт система: 409 `entry_managed_by_source`;
 * - отменённую и сторнированную не правят: 409;
 * - статья проводки может остаться, даже если её убрали в архив;
 * - старый или новый месяц закрыт — 409 `period_closed`: исправление — сторно и новая проводка.
 * Вложение остаётся у проводки.
 */
@Injectable()
export class CorrectEntryUseCase {
    constructor(
        private readonly input: LedgerEntryInputService,
        private readonly ledger: LedgerRepository,
        private readonly entries: LedgerEntriesService
    ) {}

    async execute(
        portalId: string,
        employeeId: string,
        id: string,
        input: EntryInput,
        allowDuplicate: boolean
    ): Promise<LedgerEntryView> {
        const current = await this.entries.findOrFail(portalId, id);
        assertManual(current);
        assertLive(current);
        const resolved = await this.input.resolve(portalId, input, current.categoryId);
        await assertNotDuplicate(this.ledger, portalId, resolved, id, allowDuplicate);
        const { secret, ...fields } = resolved;
        await this.ledger
            .update(
                portalId,
                id,
                { ...fields, secret: { ...secret, attachment: current.secret.attachment } },
                [entryUpdatedEvent(portalId, id, resolved.occurredOn, employeeActor(employeeId))]
            )
            .catch(rethrowClosedPeriod);
        return this.entries.get(portalId, id);
    }
}
