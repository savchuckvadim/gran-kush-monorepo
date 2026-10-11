import type { BadgeTone } from "@/modules/shared/ui/Badge";

import type { ClubSubscription, SubscriptionStatus } from "./api";

// Те же правила, что в DTO API: форма отсекает очевидные ошибки до запроса
export const PLAN_CODE_PATTERN = /^[a-z0-9-]+$/;
export const AMOUNT_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;
export const STRIPE_PRICE_ID_PATTERN = /^price_[A-Za-z0-9]+$/;
export const CURRENCY_PATTERN = /^[A-Z]{3}$/;
export const PLAN_INTERVALS = ["month", "year"] as const;
export type PlanInterval = (typeof PLAN_INTERVALS)[number];
export const MANUAL_PAYMENT_MAX_MONTHS = 36;

export const SUBSCRIPTION_STATUS_TONES: Record<SubscriptionStatus, BadgeTone> = {
    trialing: "info",
    active: "success",
    past_due: "warning",
    canceled: "neutral",
    expired: "danger",
};

/** Подписку ведёт Stripe: ручные оплата и триал вернут 409. */
export const isManagedByStripe = (subscription: ClubSubscription | null): boolean =>
    subscription?.provider === "stripe" &&
    (subscription.status === "active" || subscription.status === "past_due");

/** Сумма × количество без ошибок плавающей точки: "49.00" × 3 → "147.00". */
export const multiplyAmount = (amount: string, times: number): string =>
    ((Math.round(Number(amount) * 100) * times) / 100).toFixed(2);

// Даты сроков показываются и вводятся в UTC, иначе `<input type="date">` сдвигал бы день
export const dateInputToIso = (value: string): string =>
    new Date(`${value}T00:00:00.000Z`).toISOString();

export const isoToDateInput = (iso: string | null): string => (iso ? iso.slice(0, 10) : "");
