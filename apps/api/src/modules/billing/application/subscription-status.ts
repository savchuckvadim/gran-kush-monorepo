import { SubscriptionStatus } from "@prisma/client";

/**
 * Статус подписки Stripe → наш. `null` — статус не меняем и ждём следующего события:
 * incomplete (первая оплата ещё идёт, например 3-D Secure) и paused.
 */
export const toSubscriptionStatus = (providerStatus: string): SubscriptionStatus | null => {
    switch (providerStatus) {
        case "active":
            return SubscriptionStatus.active;
        case "trialing":
            return SubscriptionStatus.trialing;
        // unpaid — Stripe исчерпал повторы, но подписку не отменил: для нас это та же неоплата
        case "past_due":
        case "unpaid":
            return SubscriptionStatus.past_due;
        case "canceled":
        case "incomplete_expired":
            return SubscriptionStatus.canceled;
        default:
            return null;
    }
};

/**
 * Конец льготного периода. Уже начатый не сдвигаем: каждое новое событие о неоплате
 * иначе продлевало бы доступ ещё на неделю.
 */
export const graceEndFor = (
    status: SubscriptionStatus | null,
    current: { status: SubscriptionStatus; graceEndsAt: Date | null },
    graceEndFrom: () => Date
): Date | null => {
    if (status === null) {
        return current.graceEndsAt;
    }
    if (status !== SubscriptionStatus.past_due) {
        return null;
    }
    return current.status === SubscriptionStatus.past_due && current.graceEndsAt
        ? current.graceEndsAt
        : graceEndFrom();
};
