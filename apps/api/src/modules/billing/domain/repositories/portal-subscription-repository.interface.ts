import { SubscriptionStatus } from "@prisma/client";

export interface PortalSubscriptionPlanView {
    id: string;
    code: string;
    name: string;
    priceAmount: string;
    currency: string;
    interval: string;
}

export interface PortalSubscriptionView {
    id: string;
    portalId: string;
    /** Адрес клуба в CRM: /{locale}/{portalSlug}/crm */
    portalSlug: string;
    status: SubscriptionStatus;
    plan: PortalSubscriptionPlanView;
    trialEndsAt: Date | null;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    graceEndsAt: Date | null;
    cancelAtPeriodEnd: boolean;
    provider: string | null;
    providerCustomerId: string | null;
    providerSubscriptionId: string | null;
}

export interface AdminPortalSubscriptionView {
    portalId: string;
    portalName: string;
    portalDisplayName: string;
    portalCreatedAt: Date;
    subscription: PortalSubscriptionView | null;
}

/** Состояние подписки, которое прислал провайдер. `status: null` — статус не трогать. */
export interface ProviderSubscriptionState {
    provider: string;
    providerCustomerId: string;
    providerSubscriptionId: string;
    status: SubscriptionStatus | null;
    planId: string | null;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    graceEndsAt: Date | null;
}

export interface ManualPaymentState {
    planId: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    /** Платёж пишется вместе с продлением, в одной транзакции. */
    payment: { externalId: string; amount: string; currency: string; paidAt: Date };
}

export abstract class PortalSubscriptionRepository {
    abstract findByPortalId(portalId: string): Promise<PortalSubscriptionView | null>;

    abstract findByProviderSubscriptionId(
        providerSubscriptionId: string
    ): Promise<PortalSubscriptionView | null>;

    abstract findByProviderCustomerId(
        providerCustomerId: string
    ): Promise<PortalSubscriptionView | null>;

    abstract listForAdmin(): Promise<AdminPortalSubscriptionView[]>;

    /** Портал оплатил через провайдера: запомнить клиента и подписку до прихода её состояния. */
    abstract linkProvider(
        portalId: string,
        link: {
            provider: string;
            providerCustomerId: string;
            providerSubscriptionId: string | null;
        }
    ): Promise<void>;

    abstract applyProviderState(portalId: string, state: ProviderSubscriptionState): Promise<void>;

    /** Оплата вне провайдера: подписка active до `currentPeriodEnd`, дальше её проверяет крон. */
    abstract applyManualPayment(portalId: string, state: ManualPaymentState): Promise<void>;

    /** Новый конец бесплатного периода; подписка возвращается в trialing. */
    abstract setTrialEnd(portalId: string, trialEndsAt: Date): Promise<void>;
}
