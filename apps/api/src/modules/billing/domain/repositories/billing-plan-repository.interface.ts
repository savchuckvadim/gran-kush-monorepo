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

/** Тариф целиком — для админки и для оплаты. */
export interface BillingPlanView extends BillingPlanCatalogItem {
    id: string;
    isActive: boolean;
    isPublic: boolean;
    stripePriceId: string | null;
}

export interface BillingPlanCreateInput {
    code: string;
    name: string;
    priceAmount: string;
    currency: string;
    interval: string;
    features: BillingPlanFeatures;
    isActive: boolean;
    isPublic: boolean;
    stripePriceId: string | null;
}

export type BillingPlanUpdateInput = Partial<Omit<BillingPlanCreateInput, "code">>;

export abstract class BillingPlanRepository {
    /**
     * Публичный каталог: активные и не скрытые тарифы по возрастанию цены;
     * при равной цене — по коду, чтобы порядок не плавал.
     */
    abstract findActivePlansForCatalog(): Promise<BillingPlanCatalogItem[]>;

    /** Все тарифы, включая архивные и скрытые. */
    abstract findAll(): Promise<BillingPlanView[]>;

    abstract findByCode(code: string): Promise<BillingPlanView | null>;

    abstract findByStripePriceId(stripePriceId: string): Promise<BillingPlanView | null>;

    abstract create(input: BillingPlanCreateInput): Promise<BillingPlanView>;

    abstract update(code: string, input: BillingPlanUpdateInput): Promise<BillingPlanView>;
}
