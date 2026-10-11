import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
    ServiceUnavailableException,
} from "@nestjs/common";

import { SubscriptionStatus } from "@prisma/client";
import { randomUUID } from "crypto";

import { BillingProvider } from "@modules/billing/domain/billing-provider.interface";
import { BILLING_PROVIDERS } from "@modules/billing/domain/billing-providers";
import { amountToCents, centsToAmount } from "@modules/billing/domain/money";
import {
    BillingPlanFeatures,
    BillingPlanRepository,
    BillingPlanUpdateInput,
    BillingPlanView,
} from "@modules/billing/domain/repositories/billing-plan-repository.interface";
import {
    AdminPortalSubscriptionView,
    PortalSubscriptionRepository,
    PortalSubscriptionView,
} from "@modules/billing/domain/repositories/portal-subscription-repository.interface";

import { addMonths } from "../billing-settings";

export interface CreatePlanInput {
    code: string;
    name?: string;
    stripePriceId?: string | null;
    priceAmount?: string;
    currency?: string;
    interval?: string;
    features?: BillingPlanFeatures;
    isActive?: boolean;
    isPublic?: boolean;
}

export type UpdatePlanInput = Omit<CreatePlanInput, "code">;

export interface ManualPaymentInput {
    months: number;
    /** Не задана — цена тарифа × месяцы. */
    amount?: string;
    /** Перевести на другой тариф вместе с оплатой. */
    planCode?: string;
}

/**
 * Платформенная админка: тарифы и подписки клубов.
 *
 * Цена тарифа с `stripePriceId` всегда берётся из Stripe — так сайт, CRM и списание
 * не разойдутся. Тариф без Stripe — для ручной оплаты (перевод, наличные).
 */
@Injectable()
export class AdminBillingService {
    constructor(
        private readonly provider: BillingProvider,
        private readonly plans: BillingPlanRepository,
        private readonly subscriptions: PortalSubscriptionRepository
    ) {}

    listPlans(): Promise<BillingPlanView[]> {
        return this.plans.findAll();
    }

    async createPlan(input: CreatePlanInput): Promise<BillingPlanView> {
        if (await this.plans.findByCode(input.code)) {
            throw new ConflictException(`Plan ${input.code} already exists`);
        }
        const fromProvider = input.stripePriceId
            ? await this.priceFromProvider(input.stripePriceId)
            : null;
        if (!fromProvider && input.priceAmount === undefined) {
            throw new BadRequestException("Set stripePriceId or priceAmount");
        }
        return this.plans.create({
            code: input.code,
            name: input.name ?? fromProvider?.productName ?? input.code,
            priceAmount: fromProvider?.amount ?? input.priceAmount ?? "0.00",
            currency: fromProvider?.currency ?? input.currency ?? "EUR",
            interval: fromProvider?.interval ?? input.interval ?? "month",
            features: input.features ?? {},
            isActive: input.isActive ?? true,
            isPublic: input.isPublic ?? true,
            stripePriceId: fromProvider?.id ?? null,
        });
    }

    /**
     * Новая цена в Stripe не меняет уже оформленные подписки — они списывают по старой.
     * Тариф с новой ценой лучше завести новым кодом, а старый скрыть.
     */
    async updatePlan(code: string, input: UpdatePlanInput): Promise<BillingPlanView> {
        if (!(await this.plans.findByCode(code))) {
            throw new NotFoundException("Plan not found");
        }
        const fromProvider = input.stripePriceId
            ? await this.priceFromProvider(input.stripePriceId)
            : null;
        const update: BillingPlanUpdateInput = {
            name: input.name,
            features: input.features,
            isActive: input.isActive,
            isPublic: input.isPublic,
            ...(input.stripePriceId === null ? { stripePriceId: null } : {}),
            ...(fromProvider
                ? {
                      stripePriceId: fromProvider.id,
                      priceAmount: fromProvider.amount,
                      currency: fromProvider.currency,
                      interval: fromProvider.interval,
                  }
                : {
                      priceAmount: input.priceAmount,
                      currency: input.currency,
                      interval: input.interval,
                  }),
        };
        return this.plans.update(code, update);
    }

    listSubscriptions(): Promise<AdminPortalSubscriptionView[]> {
        return this.subscriptions.listForAdmin();
    }

    /** Оплата вне Stripe: подписка active на `months` месяцев, следующий срок проверяет крон. */
    async recordManualPayment(
        portalId: string,
        input: ManualPaymentInput
    ): Promise<PortalSubscriptionView> {
        const subscription = await this.requireSubscription(portalId);
        this.assertNotManagedByProvider(subscription);

        const plan = input.planCode ? await this.plans.findByCode(input.planCode) : null;
        if (input.planCode && !plan) {
            throw new NotFoundException("Plan not found");
        }
        const planId = plan?.id ?? subscription.plan.id;
        const planPrice = plan?.priceAmount ?? subscription.plan.priceAmount;
        const currency = plan?.currency ?? subscription.plan.currency;

        // Продление оплаченного срока идёт от его конца, а не от сегодняшнего дня
        const now = new Date();
        const periodStart =
            subscription.status === SubscriptionStatus.active &&
            subscription.currentPeriodEnd &&
            subscription.currentPeriodEnd > now
                ? subscription.currentPeriodEnd
                : now;

        await this.subscriptions.applyManualPayment(portalId, {
            planId,
            currentPeriodStart: periodStart,
            currentPeriodEnd: addMonths(periodStart, input.months),
            payment: {
                externalId: randomUUID(),
                amount: input.amount ?? centsToAmount(amountToCents(planPrice) * input.months),
                currency,
                paidAt: now,
            },
        });
        return this.requireSubscription(portalId);
    }

    async setTrialEnd(portalId: string, trialEndsAt: Date): Promise<PortalSubscriptionView> {
        const subscription = await this.requireSubscription(portalId);
        this.assertNotManagedByProvider(subscription);
        await this.subscriptions.setTrialEnd(portalId, trialEndsAt);
        return this.requireSubscription(portalId);
    }

    private assertNotManagedByProvider(subscription: PortalSubscriptionView): void {
        if (
            subscription.provider === BILLING_PROVIDERS.STRIPE &&
            subscription.providerSubscriptionId &&
            subscription.status !== SubscriptionStatus.canceled &&
            subscription.status !== SubscriptionStatus.expired
        ) {
            throw new ConflictException(
                "The club pays through Stripe — change its subscription in the Stripe dashboard"
            );
        }
    }

    private async priceFromProvider(stripePriceId: string) {
        if (!this.provider.isConfigured()) {
            throw new ServiceUnavailableException(
                "STRIPE_SECRET_KEY is not set — the price cannot be checked"
            );
        }
        const price = await this.provider.retrievePrice(stripePriceId);
        if (!price.active) {
            throw new BadRequestException("This Stripe price is archived");
        }
        return price;
    }

    private async requireSubscription(portalId: string): Promise<PortalSubscriptionView> {
        const subscription = await this.subscriptions.findByPortalId(portalId);
        if (!subscription) {
            throw new NotFoundException("The club has no subscription");
        }
        return subscription;
    }
}
