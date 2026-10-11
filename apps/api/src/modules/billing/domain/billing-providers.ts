/** Кто ведёт подписку портала (`PortalSubscription.provider`). */
export const BILLING_PROVIDERS = {
    /** Статус и период приходят вебхуками Stripe, списания делает Stripe. */
    STRIPE: "stripe",
    /** Оплата вне провайдера (перевод, наличные): продление из админки, срок проверяет крон. */
    MANUAL: "manual",
} as const;

export type BillingProviderName = (typeof BILLING_PROVIDERS)[keyof typeof BILLING_PROVIDERS];
