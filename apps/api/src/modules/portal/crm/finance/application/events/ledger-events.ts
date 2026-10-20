import type { EventActor } from "@workspace/domain-events";

import type { NewDomainEvent } from "@modules/events";

import type { LedgerBook } from "../../domain/export/ledger-export";
import { type FinanceMonth, monthKey, monthOf } from "../../domain/ledger/finance-period";
import type { NewLedgerEntry } from "../../domain/repositories/ledger-repository.interface";

/** Сумм и контрагентов в событиях нет: суммы шифруются, событие только говорит «изменилось». */
const periodOf = (date: string): string => monthKey(monthOf(date));

export const entryRecordedEvent = (
    portalId: string,
    entry: Pick<
        NewLedgerEntry,
        "id" | "direction" | "categoryId" | "occurredOn" | "sourceType" | "reversalOfId"
    >,
    actor: EventActor
): NewDomainEvent => ({
    name: "finance.entry_recorded",
    portalId,
    actor,
    aggregateId: entry.id,
    payload: {
        entryId: entry.id,
        direction: entry.direction,
        categoryId: entry.categoryId,
        period: periodOf(entry.occurredOn),
        source: entry.sourceType,
        reversalOf: entry.reversalOfId,
    },
});

export const entryUpdatedEvent = (
    portalId: string,
    entryId: string,
    occurredOn: string,
    actor: EventActor
): NewDomainEvent => ({
    name: "finance.entry_updated",
    portalId,
    actor,
    aggregateId: entryId,
    payload: { entryId, period: periodOf(occurredOn) },
});

export const entryVoidedEvent = (
    portalId: string,
    entryId: string,
    occurredOn: string,
    actor: EventActor
): NewDomainEvent => ({
    name: "finance.entry_voided",
    portalId,
    actor,
    aggregateId: entryId,
    payload: { entryId, period: periodOf(occurredOn) },
});

export const entriesImportedEvent = (
    portalId: string,
    count: number,
    dates: readonly string[],
    actor: EventActor
): NewDomainEvent => ({
    name: "finance.entries_imported",
    portalId,
    actor,
    aggregateId: portalId,
    payload: { count, periods: [...new Set(dates.map(periodOf))].sort() },
});

export const periodClosedEvent = (
    portalId: string,
    month: FinanceMonth,
    actor: EventActor
): NewDomainEvent => ({
    name: "finance.period_closed",
    portalId,
    actor,
    aggregateId: portalId,
    payload: { period: monthKey(month) },
});

export const periodReopenedEvent = (
    portalId: string,
    month: FinanceMonth,
    actor: EventActor
): NewDomainEvent => ({
    name: "finance.period_reopened",
    portalId,
    actor,
    aggregateId: portalId,
    payload: { period: monthKey(month) },
});

type DirectoryChange = "created" | "updated" | "archived";

export const categoriesChangedEvent = (
    portalId: string,
    categoryId: string,
    change: DirectoryChange,
    actor: EventActor
): NewDomainEvent => ({
    name: "finance.categories_changed",
    portalId,
    actor,
    aggregateId: portalId,
    payload: { categoryId, change },
});

export const counterpartiesChangedEvent = (
    portalId: string,
    counterpartyId: string,
    change: DirectoryChange,
    actor: EventActor
): NewDomainEvent => ({
    name: "finance.counterparties_changed",
    portalId,
    actor,
    aggregateId: portalId,
    payload: { counterpartyId, change },
});

export const financeAccessedEvent = (
    portalId: string,
    book: LedgerBook | "entries",
    range: { from: string; to: string },
    actor: EventActor
): NewDomainEvent => ({
    name: "finance.accessed",
    portalId,
    actor,
    aggregateId: portalId,
    payload: { kind: "export", book, from: range.from, to: range.to },
});
