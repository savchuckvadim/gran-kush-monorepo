import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
    ServiceUnavailableException,
} from "@nestjs/common";

import { SubscriptionStatus } from "@prisma/client";

import { BillingProvider } from "@modules/billing/domain/billing-provider.interface";
import { BILLING_PROVIDERS } from "@modules/billing/domain/billing-providers";
import {
    BillingPlanRepository,
    BillingPlanView,
} from "@modules/billing/domain/repositories/billing-plan-repository.interface";
import {
    PortalSubscriptionRepository,
    PortalSubscriptionView,
} from "@modules/billing/domain/repositories/portal-subscription-repository.interface";

import { BillingSettings } from "../billing-settings";

export interface PortalBillingPlanOption {
    code: string;
    name: string;
    priceAmount: string;
    currency: string;
    interval: string;
    /** Есть цена у провайдера и онлайн-оплата включена. */
    purchasable: boolean;
}

export interface PortalBillingOverview {
    subscription: PortalSubscriptionView;
    paymentsEnabled: boolean;
    /** Кабинет провайдера: карта, отмена, счета. */
    canManage: boolean;
    plans: PortalBillingPlanOption[];
}

/** Оплата подписки клуба из CRM: обзор, переход к оплате, кабинет провайдера. */
@Injectable()
export class PortalBillingService {
    constructor(
        private readonly provider: BillingProvider,
        private readonly subscriptions: PortalSubscriptionRepository,
        private readonly plans: BillingPlanRepository,
        private readonly settings: BillingSettings
    ) {}

    /**
     * `requestedPlanCode` — скрытый тариф по прямой ссылке (`?plan=prueba-month`):
     * его нет в публичном списке, но выбрать его можно.
     */
    async getOverview(
        portalId: string,
        requestedPlanCode?: string
    ): Promise<PortalBillingOverview> {
        const subscription = await this.requireSubscription(portalId);
        const paymentsEnabled = this.provider.isConfigured();
        const plans = (await this.plans.findAll()).filter(
            (plan) =>
                plan.isActive &&
                Number(plan.priceAmount) > 0 &&
                (plan.isPublic || plan.code === requestedPlanCode)
        );
        return {
            subscription,
            paymentsEnabled,
            canManage:
                paymentsEnabled &&
                subscription.provider === BILLING_PROVIDERS.STRIPE &&
                subscription.providerCustomerId !== null,
            plans: plans.map((plan) => this.toOption(plan, paymentsEnabled)),
        };
    }

    async startCheckout(
        portalId: string,
        input: { planCode: string; customerEmail: string; locale: string }
    ): Promise<{ url: string }> {
        if (!this.provider.isConfigured()) {
            throw new ServiceUnavailableException("Online payments are not configured yet");
        }
        const subscription = await this.requireSubscription(portalId);
        if (this.hasLiveProviderSubscription(subscription)) {
            throw new ConflictException(
                "The club already pays online — change the plan or the card in the billing portal"
            );
        }
        const plan = await this.plans.findByCode(input.planCode);
        if (!plan || !plan.isActive) {
            throw new NotFoundException("Plan not found");
        }
        if (!plan.stripePriceId) {
            throw new BadRequestException("This plan cannot be paid online");
        }
        const billingPage = this.billingPageUrl(input.locale, subscription.portalSlug);
        return this.provider.createCheckout({
            portalId,
            priceId: plan.stripePriceId,
            customerId: subscription.providerCustomerId,
            customerEmail: input.customerEmail,
            successUrl: `${billingPage}?checkout=success`,
            cancelUrl: `${billingPage}?checkout=cancel`,
            locale: input.locale,
        });
    }

    async openManagement(portalId: string, locale: string): Promise<{ url: string }> {
        if (!this.provider.isConfigured()) {
            throw new ServiceUnavailableException("Online payments are not configured yet");
        }
        const subscription = await this.requireSubscription(portalId);
        if (
            subscription.provider !== BILLING_PROVIDERS.STRIPE ||
            !subscription.providerCustomerId
        ) {
            throw new BadRequestException("The club has no online subscription yet");
        }
        return this.provider.createManagementSession({
            customerId: subscription.providerCustomerId,
            returnUrl: this.billingPageUrl(locale, subscription.portalSlug),
            locale,
        });
    }

    private hasLiveProviderSubscription(subscription: PortalSubscriptionView): boolean {
        return (
            subscription.provider === BILLING_PROVIDERS.STRIPE &&
            subscription.providerSubscriptionId !== null &&
            (subscription.status === SubscriptionStatus.active ||
                subscription.status === SubscriptionStatus.past_due)
        );
    }

    /** Адрес возврата строится на сервере: из клиента принимать URL нельзя — это открытый редирект. */
    private billingPageUrl(locale: string, portalSlug: string): string {
        return `${this.settings.crmUrl}/${locale}/${portalSlug}/crm/settings/billing`;
    }

    private async requireSubscription(portalId: string): Promise<PortalSubscriptionView> {
        const subscription = await this.subscriptions.findByPortalId(portalId);
        if (!subscription) {
            throw new NotFoundException("The club has no subscription");
        }
        return subscription;
    }

    private toOption(plan: BillingPlanView, paymentsEnabled: boolean): PortalBillingPlanOption {
        return {
            code: plan.code,
            name: plan.name,
            priceAmount: plan.priceAmount,
            currency: plan.currency,
            interval: plan.interval,
            purchasable: paymentsEnabled && plan.stripePriceId !== null,
        };
    }
}
