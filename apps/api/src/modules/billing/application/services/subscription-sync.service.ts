import { Injectable, Logger } from "@nestjs/common";

import { PaymentStatus } from "@prisma/client";

import {
    BillingProvider,
    ProviderInvoice,
} from "@modules/billing/domain/billing-provider.interface";
import { BILLING_PROVIDERS } from "@modules/billing/domain/billing-providers";
import { PaymentEventInput } from "@modules/billing/domain/payment-webhook.types";
import { BillingPlanRepository } from "@modules/billing/domain/repositories/billing-plan-repository.interface";
import {
    PortalSubscriptionRepository,
    PortalSubscriptionView,
} from "@modules/billing/domain/repositories/portal-subscription-repository.interface";

import { BillingSettings } from "../billing-settings";
import { graceEndFor, toSubscriptionStatus } from "../subscription-status";

import { PaymentsService } from "./payments.service";

/**
 * Вебхуки провайдера → подписка портала.
 *
 * Состояние подписки не собирается из тел событий: на каждое событие читается актуальная
 * подписка у провайдера. Stripe не гарантирует порядок доставки, и старое
 * `subscription.updated`, пришедшее после нового, иначе откатило бы статус. Повторная
 * обработка того же события безопасна: синхронизация идемпотентна, платёж — по `(provider, externalId)`.
 */
@Injectable()
export class SubscriptionSyncService {
    private readonly logger = new Logger(SubscriptionSyncService.name);

    constructor(
        private readonly provider: BillingProvider,
        private readonly subscriptions: PortalSubscriptionRepository,
        private readonly plans: BillingPlanRepository,
        private readonly payments: PaymentsService,
        private readonly settings: BillingSettings
    ) {}

    async handle(event: PaymentEventInput): Promise<void> {
        const parsed = this.provider.parseEvent(event.payload);
        switch (parsed.kind) {
            case "checkout_completed":
                return this.onCheckoutCompleted(parsed);
            case "subscription_changed":
                return this.syncSubscription(parsed.subscriptionId, parsed.portalId);
            case "invoice_paid":
                return this.onInvoicePaid(parsed.invoice);
            case "ignored":
                return;
        }
    }

    private async onCheckoutCompleted(event: {
        portalId: string | null;
        customerId: string | null;
        subscriptionId: string | null;
    }): Promise<void> {
        if (!event.portalId || !event.customerId) {
            this.logger.warn("Checkout completed without portal or customer — ignored");
            return;
        }
        const local = await this.subscriptions.findByPortalId(event.portalId);
        if (!local) {
            this.logger.warn(
                `Checkout completed for portal ${event.portalId} without a subscription`
            );
            return;
        }
        await this.subscriptions.linkProvider(event.portalId, {
            provider: this.provider.name,
            providerCustomerId: event.customerId,
            providerSubscriptionId: event.subscriptionId,
        });
        if (event.subscriptionId) {
            await this.syncSubscription(event.subscriptionId, event.portalId);
        }
    }

    private async onInvoicePaid(invoice: ProviderInvoice): Promise<void> {
        const local = await this.findLocal({
            subscriptionId: invoice.subscriptionId,
            portalId: invoice.portalId,
            customerId: invoice.customerId,
        });
        if (!local || !invoice.id) {
            this.logger.warn(`Paid invoice ${invoice.id} does not match any portal — ignored`);
            return;
        }
        await this.payments.recordProviderPayment({
            portalId: local.portalId,
            provider: this.provider.name,
            externalId: invoice.id,
            amount: invoice.amountPaid,
            currency: invoice.currency,
            status: PaymentStatus.succeeded,
            paidAt: invoice.paidAt,
            periodStart: invoice.periodStart,
            periodEnd: invoice.periodEnd,
        });
        if (invoice.subscriptionId) {
            await this.syncSubscription(invoice.subscriptionId, local.portalId);
        }
    }

    private async syncSubscription(subscriptionId: string, portalIdHint: string | null) {
        const remote = await this.provider.retrieveSubscription(subscriptionId);
        const local = await this.findLocal({
            subscriptionId,
            portalId: portalIdHint ?? remote.portalId,
            customerId: null,
        });
        if (!local) {
            this.logger.warn(`Subscription ${subscriptionId} does not match any portal — ignored`);
            return;
        }

        const status = toSubscriptionStatus(remote.status);
        // У портала уже другая живая подписка провайдера (клиент оформил новую):
        // завершение старой не должно гасить доступ
        if (
            local.providerSubscriptionId &&
            local.providerSubscriptionId !== remote.id &&
            status !== "active"
        ) {
            this.logger.log(
                `Subscription ${remote.id} is not the current one of portal ${local.portalId} — ignored`
            );
            return;
        }

        const plan = remote.priceId ? await this.plans.findByStripePriceId(remote.priceId) : null;
        if (remote.priceId && !plan) {
            this.logger.warn(`Stripe price ${remote.priceId} is not linked to any plan`);
        }

        await this.subscriptions.applyProviderState(local.portalId, {
            provider: BILLING_PROVIDERS.STRIPE,
            providerCustomerId: remote.customerId,
            providerSubscriptionId: remote.id,
            status,
            planId: plan?.id ?? null,
            currentPeriodStart: remote.currentPeriodStart,
            currentPeriodEnd: remote.currentPeriodEnd,
            cancelAtPeriodEnd: remote.cancelAtPeriodEnd,
            graceEndsAt: graceEndFor(status, local, () => this.settings.graceEndFrom(new Date())),
        });
    }

    private async findLocal(ref: {
        subscriptionId: string | null;
        portalId: string | null;
        customerId: string | null;
    }): Promise<PortalSubscriptionView | null> {
        if (ref.subscriptionId) {
            const bySubscription = await this.subscriptions.findByProviderSubscriptionId(
                ref.subscriptionId
            );
            if (bySubscription) return bySubscription;
        }
        if (ref.portalId) {
            const byPortal = await this.subscriptions.findByPortalId(ref.portalId);
            if (byPortal) return byPortal;
        }
        return ref.customerId ? this.subscriptions.findByProviderCustomerId(ref.customerId) : null;
    }
}
