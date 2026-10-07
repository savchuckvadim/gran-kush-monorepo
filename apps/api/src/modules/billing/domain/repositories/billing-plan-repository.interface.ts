/** Флаги возможностей тарифа из `BillingPlan.featuresJson`: `{ crm: true, messenger: false }`. */
export type BillingPlanFeatures = Record<string, boolean>;

/** Тариф в публичном каталоге — то, что видит посетитель сайта до регистрации портала. */
export interface BillingPlanCatalogItem {
    code: string;
    name: string;
    /**
     * Цена за один `interval` строкой с двумя знаками после точки: `"49.00"`.
     * Строка, а не number: сумма `Decimal(12,2)` не должна проходить через float.
     */
    priceAmount: string;
    currency: string;
    interval: string;
    features: BillingPlanFeatures;
}

export abstract class BillingPlanRepository {
    /** Активные тарифы по возрастанию цены; при равной цене — по коду, чтобы порядок не плавал. */
    abstract findActivePlansForCatalog(): Promise<BillingPlanCatalogItem[]>;
}
