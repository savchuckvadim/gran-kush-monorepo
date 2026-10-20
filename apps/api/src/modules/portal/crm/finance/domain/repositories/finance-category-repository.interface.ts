import type { TaxTreatment } from "@prisma/client";

import type { NewDomainEvent, OutboxTransaction } from "@modules/events";

import type {
    CategoryDirection,
    FinanceCategory,
    FinanceCategoryPreset,
} from "../ledger/finance-category";

export interface NewFinanceCategory {
    code: string;
    name: string;
    direction: CategoryDirection;
    pgcAccount: string | null;
    taxTreatment: TaxTreatment | null;
}

export interface FinanceCategoryChange {
    name?: string | null;
    pgcAccount?: string | null;
    taxTreatment?: TaxTreatment | null;
}

/** Статьи доходов и расходов клуба. Изменение и его события — одной транзакцией. */
export abstract class FinanceCategoryRepository {
    abstract list(
        portalId: string,
        options: { includeArchived: boolean }
    ): Promise<FinanceCategory[]>;

    abstract findById(portalId: string, id: string): Promise<FinanceCategory | null>;

    abstract findByCode(portalId: string, code: string): Promise<FinanceCategory | null>;

    /** Пресет: создаёт недостающие коды, своё и архивное не трогает. */
    abstract seedPresets(
        portalId: string,
        presets: readonly FinanceCategoryPreset[],
        tx?: OutboxTransaction
    ): Promise<void>;

    abstract create(
        portalId: string,
        category: NewFinanceCategory,
        events: (created: FinanceCategory) => NewDomainEvent[]
    ): Promise<FinanceCategory>;

    abstract update(
        portalId: string,
        id: string,
        change: FinanceCategoryChange,
        events: readonly NewDomainEvent[]
    ): Promise<FinanceCategory>;

    abstract archive(
        portalId: string,
        id: string,
        events: readonly NewDomainEvent[]
    ): Promise<void>;
}
