import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { CounterpartyKind } from "@prisma/client";
import { randomUUID } from "crypto";

import { isUniqueViolationOn } from "@common/prisma/unique-violation";
import { employeeActor } from "@modules/events";

import {
    type Counterparty,
    COUNTERPARTY_ERRORS,
    type CounterpartyDetails,
    parseTaxId,
} from "../../domain/ledger/counterparty";
import { LEDGER_ERRORS } from "../../domain/ledger/ledger-entry";
import { CounterpartyRepository } from "../../domain/repositories/counterparty-repository.interface";
import { FinanceDirectory } from "../../domain/repositories/finance-sources.interface";
import { counterpartiesChangedEvent } from "../events/ledger-events";

export interface CounterpartyInput {
    kind: CounterpartyKind;
    name: string;
    nif: string | null;
    country: string | null;
    notes: string | null;
}

/** Контрагент для экрана: имя участника подставлено из его карточки, удалённый участник — `null`. */
export interface CounterpartyView {
    id: string;
    kind: CounterpartyKind;
    memberId: string | null;
    name: string | null;
    nif: string | null;
    country: string | null;
    notes: string | null;
    archivedAt: Date | null;
    entryCount: number;
}

const badRequest = (code: string, message: string) => new BadRequestException({ message, code });

const nifTaken = () =>
    new ConflictException({
        message: "A counterparty with this tax id exists",
        code: COUNTERPARTY_ERRORS.nifTaken,
    });

const toView = (
    c: Counterparty,
    memberNames: ReadonlyMap<string, string>,
    entryCount: number
): CounterpartyView => ({
    id: c.id,
    kind: c.kind,
    memberId: c.memberId,
    name: c.details?.name ?? (c.memberId ? (memberNames.get(c.memberId) ?? null) : null),
    nif: c.details?.nif ?? null,
    country: c.details?.country ?? null,
    notes: c.details?.notes ?? null,
    archivedAt: c.archivedAt,
    entryCount,
});

/**
 * Контрагенты клуба: поставщики, клиенты, госорганы — вручную; участник клуба становится
 * контрагентом сам, когда на него записан доход. Налоговый номер в клубе один на контрагента.
 */
@Injectable()
export class CounterpartiesService {
    constructor(
        private readonly repository: CounterpartyRepository,
        private readonly directory: FinanceDirectory
    ) {}

    async list(portalId: string, includeArchived: boolean): Promise<CounterpartyView[]> {
        const [counterparties, counts] = await Promise.all([
            this.repository.list(portalId, { includeArchived }),
            this.repository.entryCounts(portalId),
        ]);
        const names = await this.memberNames(portalId, counterparties);
        return counterparties.map((c) => toView(c, names, counts.get(c.id) ?? 0));
    }

    /** Имена и номера контрагентов по id — для реестра и выгрузок. */
    async namesOf(
        portalId: string,
        ids: readonly string[]
    ): Promise<Map<string, { name: string; nif: string | null }>> {
        const counterparties = await this.repository.findByIds(portalId, [...new Set(ids)]);
        const names = await this.memberNames(portalId, counterparties);
        return new Map(
            counterparties.map((c) => {
                const view = toView(c, names, 0);
                return [c.id, { name: view.name ?? "", nif: view.nif }];
            })
        );
    }

    async create(
        portalId: string,
        input: CounterpartyInput,
        employeeId: string
    ): Promise<CounterpartyView> {
        const details = await this.validated(portalId, input, null);
        const id = randomUUID();
        const actor = employeeActor(employeeId);
        const created = await this.repository
            .create(portalId, { id, kind: input.kind, details }, [
                counterpartiesChangedEvent(portalId, id, "created", actor),
            ])
            .catch((error: unknown) => this.rethrowNifTaken(error));
        return toView(created, new Map(), 0);
    }

    async update(
        portalId: string,
        id: string,
        input: CounterpartyInput,
        employeeId: string
    ): Promise<CounterpartyView> {
        const current = await this.findOrFail(portalId, id);
        if (current.kind === CounterpartyKind.member) {
            throw badRequest(
                COUNTERPARTY_ERRORS.memberManaged,
                "Member counterparty follows the member"
            );
        }
        const details = await this.validated(portalId, input, id);
        const actor = employeeActor(employeeId);
        const updated = await this.repository
            .update(portalId, id, { kind: input.kind, details }, [
                counterpartiesChangedEvent(portalId, id, "updated", actor),
            ])
            .catch((error: unknown) => this.rethrowNifTaken(error));
        return toView(updated, new Map(), 0);
    }

    async archive(portalId: string, id: string, employeeId: string): Promise<void> {
        const current = await this.findOrFail(portalId, id);
        if (current.archivedAt) return;
        await this.repository.archive(portalId, id, [
            counterpartiesChangedEvent(portalId, id, "archived", employeeActor(employeeId)),
        ]);
    }

    /** Контрагент проводки: участник клуба (заводится по требованию) или свой контрагент. */
    async resolveForEntry(
        portalId: string,
        ref: { counterpartyId: string | null; memberId: string | null }
    ): Promise<string | null> {
        if (ref.memberId) {
            if (!(await this.directory.memberExists(portalId, ref.memberId))) {
                throw badRequest(LEDGER_ERRORS.memberNotFound, "Member not found");
            }
            return (await this.repository.forMember(portalId, ref.memberId)).id;
        }
        if (!ref.counterpartyId) return null;
        if (!(await this.repository.findById(portalId, ref.counterpartyId))) {
            throw badRequest(LEDGER_ERRORS.counterpartyNotFound, "Counterparty not found");
        }
        return ref.counterpartyId;
    }

    private async validated(
        portalId: string,
        input: CounterpartyInput,
        selfId: string | null
    ): Promise<CounterpartyDetails> {
        if (input.kind === CounterpartyKind.member) {
            throw badRequest(COUNTERPARTY_ERRORS.memberManaged, "Members are added by the system");
        }
        const name = input.name.trim();
        if (!name) throw badRequest(COUNTERPARTY_ERRORS.nameRequired, "Name is required");
        const country = input.country?.trim().toUpperCase() || null;
        const rawNif = input.nif?.trim() || null;
        const parsed = rawNif ? parseTaxId(rawNif, country) : null;
        if (rawNif && !parsed)
            throw badRequest(COUNTERPARTY_ERRORS.nifInvalid, "Tax id is not valid");
        if (parsed) {
            const holder = await this.repository.findByNif(portalId, parsed.value);
            if (holder && holder.id !== selfId) throw nifTaken();
        }
        return {
            name,
            nif: parsed?.value ?? null,
            country: parsed?.country ?? country,
            notes: input.notes?.trim() || null,
        };
    }

    /** Номер уже у другого контрагента: проверка пропустила гонку — его поймал индекс. */
    private rethrowNifTaken(error: unknown): never {
        if (isUniqueViolationOn(error, "nif_index")) throw nifTaken();
        throw error;
    }

    private async findOrFail(portalId: string, id: string): Promise<Counterparty> {
        const counterparty = await this.repository.findById(portalId, id);
        if (!counterparty) throw new NotFoundException("Counterparty not found");
        return counterparty;
    }

    private memberNames(
        portalId: string,
        list: readonly Counterparty[]
    ): Promise<Map<string, string>> {
        const ids = list.flatMap((c) => (c.memberId ? [c.memberId] : []));
        return this.directory.memberNames(portalId, ids);
    }
}
