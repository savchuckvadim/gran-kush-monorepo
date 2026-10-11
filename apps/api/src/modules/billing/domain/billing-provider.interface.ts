/**
 * Платёжный провайдер подписок (сейчас Stripe). Сервисы биллинга видят только этот порт:
 * типы и JSON провайдера остаются в infrastructure.
 */

/** Цена провайдера: из неё при сохранении тарифа кэшируются сумма, валюта и период. */
export interface ProviderPrice {
    id: string;
    /** Сумма за период строкой с двумя знаками: `"5.00"` — без float. */
    amount: string;
    /** ISO 4217 в верхнем регистре. */
    currency: string;
    interval: string;
    intervalCount: number;
    active: boolean;
    productName: string | null;
}

export interface ProviderSubscription {
    id: string;
    customerId: string;
    /** Статус провайдера как есть: active, trialing, past_due, unpaid, canceled, incomplete, ... */
    status: string;
    priceId: string | null;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    /** Портал из метаданных подписки — их ставит наш checkout. */
    portalId: string | null;
}

export interface ProviderInvoice {
    id: string;
    subscriptionId: string | null;
    customerId: string | null;
    portalId: string | null;
    amountPaid: string;
    currency: string;
    paidAt: Date | null;
    periodStart: Date | null;
    periodEnd: Date | null;
}

/** Событие вебхука, переведённое на язык биллинга. */
export type BillingProviderEvent =
    | {
          kind: "checkout_completed";
          portalId: string | null;
          customerId: string | null;
          subscriptionId: string | null;
      }
    | { kind: "subscription_changed"; subscriptionId: string; portalId: string | null }
    | { kind: "invoice_paid"; invoice: ProviderInvoice }
    | { kind: "ignored" };

export interface ProviderCheckoutRequest {
    portalId: string;
    priceId: string;
    /** Уже известный клиент провайдера; иначе провайдер заведёт нового по email. */
    customerId: string | null;
    customerEmail: string;
    successUrl: string;
    cancelUrl: string;
    locale?: string;
}

export interface ProviderManagementRequest {
    customerId: string;
    returnUrl: string;
    locale?: string;
}

export abstract class BillingProvider {
    abstract readonly name: string;

    /** Ключи заданы: можно создавать оплату. Без них CRM показывает «оплата скоро», работает ручное продление. */
    abstract isConfigured(): boolean;

    abstract retrievePrice(priceId: string): Promise<ProviderPrice>;

    abstract retrieveSubscription(subscriptionId: string): Promise<ProviderSubscription>;

    /** Страница оплаты провайдера: карту клиент вводит там, а не у нас. */
    abstract createCheckout(request: ProviderCheckoutRequest): Promise<{ url: string }>;

    /** Кабинет клиента у провайдера: карта, отмена, счета. */
    abstract createManagementSession(request: ProviderManagementRequest): Promise<{ url: string }>;

    /** Разбор уже проверенного события вебхука (`PaymentEventInput.payload`). */
    abstract parseEvent(payload: unknown): BillingProviderEvent;
}
