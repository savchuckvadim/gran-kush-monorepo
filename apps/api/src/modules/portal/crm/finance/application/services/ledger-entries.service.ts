import { Injectable, NotFoundException } from "@nestjs/common";

import { type LedgerEntry, type LedgerTotals, totalsOf } from "../../domain/ledger/ledger-entry";
import { FinanceDirectory } from "../../domain/repositories/finance-sources.interface";
import {
    type LedgerFilter,
    LedgerRepository,
} from "../../domain/repositories/ledger-repository.interface";

import { CounterpartiesService } from "./counterparties.service";

/** Проводка для экрана: итоги посчитаны, контрагент и автор названы. Суммы — в центах. */
export interface LedgerEntryView extends LedgerEntry {
    totals: LedgerTotals;
    counterpartyName: string | null;
    counterpartyNif: string | null;
    authorName: string | null;
}

/** Чтение реестра: страницы, одна проводка; права — `finance.read` на контроллере. */
@Injectable()
export class LedgerEntriesService {
    constructor(
        private readonly ledger: LedgerRepository,
        private readonly counterparties: CounterpartiesService,
        private readonly directory: FinanceDirectory
    ) {}

    async list(
        portalId: string,
        filter: LedgerFilter,
        page: { skip: number; take: number }
    ): Promise<{ items: LedgerEntryView[]; total: number }> {
        const { items, total } = await this.ledger.list(portalId, filter, page);
        return { items: await this.views(portalId, items), total };
    }

    async get(portalId: string, id: string): Promise<LedgerEntryView> {
        const [view] = await this.views(portalId, [await this.findOrFail(portalId, id)]);
        return view;
    }

    async findOrFail(portalId: string, id: string): Promise<LedgerEntry> {
        const entry = await this.ledger.findById(portalId, id);
        if (!entry) throw new NotFoundException("Ledger entry not found");
        return entry;
    }

    async views(portalId: string, entries: readonly LedgerEntry[]): Promise<LedgerEntryView[]> {
        const [parties, authors] = await Promise.all([
            this.counterparties.namesOf(
                portalId,
                entries.flatMap((entry) => (entry.counterpartyId ? [entry.counterpartyId] : []))
            ),
            this.directory.employeeNames(
                portalId,
                entries.flatMap((entry) => (entry.createdById ? [entry.createdById] : []))
            ),
        ]);
        return entries.map((entry) => {
            const party = entry.counterpartyId ? parties.get(entry.counterpartyId) : undefined;
            return {
                ...entry,
                totals: totalsOf(entry.secret),
                counterpartyName: party?.name || null,
                counterpartyNif: party?.nif ?? null,
                authorName: entry.createdById ? (authors.get(entry.createdById) ?? null) : null,
            };
        });
    }
}
