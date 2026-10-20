import type { CounterpartyKind } from "@prisma/client";

import type { NewDomainEvent } from "@modules/events";

import type { Counterparty, CounterpartyDetails } from "../ledger/counterparty";

export interface NewCounterparty {
    id: string;
    kind: CounterpartyKind;
    details: CounterpartyDetails;
}

export interface CounterpartyChange {
    kind?: CounterpartyKind;
    details?: CounterpartyDetails;
}

/**
 * Контрагенты клуба. Имя, номер и заметки хранятся шифром; найти по номеру или имени помогают
 * слепые индексы — репозиторий считает их сам. Участник клуба — одна строка на участника.
 */
export abstract class CounterpartyRepository {
    abstract list(portalId: string, options: { includeArchived: boolean }): Promise<Counterparty[]>;

    abstract findById(portalId: string, id: string): Promise<Counterparty | null>;

    abstract findByIds(portalId: string, ids: readonly string[]): Promise<Counterparty[]>;

    /** Контрагент с тем же налоговым номером (номер уже нормализован). */
    abstract findByNif(portalId: string, nif: string): Promise<Counterparty | null>;

    /** Контрагенты по номерам и именам одним запросом — сопоставить строки импорта. */
    abstract findMatches(
        portalId: string,
        query: { nifs: readonly string[]; names: readonly string[] }
    ): Promise<{ byNif: Map<string, Counterparty>; byName: Map<string, Counterparty> }>;

    abstract create(
        portalId: string,
        counterparty: NewCounterparty,
        events: readonly NewDomainEvent[]
    ): Promise<Counterparty>;

    abstract update(
        portalId: string,
        id: string,
        change: CounterpartyChange,
        events: readonly NewDomainEvent[]
    ): Promise<Counterparty>;

    abstract archive(
        portalId: string,
        id: string,
        events: readonly NewDomainEvent[]
    ): Promise<void>;

    /** Контрагент-участник: находит или заводит строку участника клуба. */
    abstract forMember(portalId: string, memberId: string): Promise<Counterparty>;

    /** Сколько проведённых проводок у каждого контрагента клуба — для списка. */
    abstract entryCounts(portalId: string): Promise<Map<string, number>>;
}
