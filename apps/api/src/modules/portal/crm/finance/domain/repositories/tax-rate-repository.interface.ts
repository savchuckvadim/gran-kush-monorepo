import type { TaxTreatment } from "@prisma/client";

import type { NewDomainEvent, OutboxTransaction } from "@modules/events";

import type { TaxRate, TaxRatePreset } from "../tax/tax-rate";

export interface NewTaxRate {
    name: string;
    percent: number;
    treatment: TaxTreatment;
}

export interface TaxRateChange {
    name?: string | null;
    percent?: number;
    treatment?: TaxTreatment;
}

/** Ставки налога клуба. Изменение и его события — в одной транзакции. */
export abstract class TaxRateRepository {
    abstract list(portalId: string, options: { includeArchived: boolean }): Promise<TaxRate[]>;

    abstract findById(portalId: string, id: string): Promise<TaxRate | null>;

    /**
     * Пресет при включении модуля: создаёт только недостающие коды и ставит `defaultCode` по
     * умолчанию, если у клуба ещё нет ставки по умолчанию. Повторное включение ничего не дублирует.
     */
    abstract seedPresets(
        portalId: string,
        presets: readonly TaxRatePreset[],
        defaultCode: string,
        tx: OutboxTransaction
    ): Promise<void>;

    abstract create(
        portalId: string,
        rate: NewTaxRate,
        events: (created: TaxRate) => NewDomainEvent[]
    ): Promise<TaxRate>;

    abstract update(
        portalId: string,
        id: string,
        change: TaxRateChange,
        events: readonly NewDomainEvent[]
    ): Promise<TaxRate>;

    /** Ровно одна ставка по умолчанию на клуб: одним UPDATE, без окна с двумя или ни одной. */
    abstract makeDefault(
        portalId: string,
        id: string,
        events: readonly NewDomainEvent[]
    ): Promise<void>;

    abstract archive(
        portalId: string,
        id: string,
        events: readonly NewDomainEvent[]
    ): Promise<void>;

    /** Сколько товаров клуба ссылается на ставку. */
    abstract countProducts(portalId: string, id: string): Promise<number>;
}
