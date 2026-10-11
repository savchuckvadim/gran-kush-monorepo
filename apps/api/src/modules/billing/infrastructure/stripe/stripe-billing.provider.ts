import {
    BadRequestException,
    Inject,
    Injectable,
    ServiceUnavailableException,
} from "@nestjs/common";

import Stripe from "stripe";

import {
    BillingProvider,
    BillingProviderEvent,
    ProviderCheckoutRequest,
    ProviderInvoice,
    ProviderManagementRequest,
    ProviderPrice,
    ProviderSubscription,
} from "@modules/billing/domain/billing-provider.interface";
import { BILLING_PROVIDERS } from "@modules/billing/domain/billing-providers";
import { centsToAmount } from "@modules/billing/domain/money";

import { STRIPE_CLIENT } from "./stripe.client";

const fromUnix = (seconds: number | null | undefined): Date | null =>
    typeof seconds === "number" ? new Date(seconds * 1000) : null;

const idOf = (ref: string | { id: string } | null | undefined): string | null =>
    typeof ref === "string" ? ref : (ref?.id ?? null);

const isStripeEvent = (payload: unknown): payload is Stripe.Event =>
    typeof payload === "object" &&
    payload !== null &&
    "type" in payload &&
    typeof payload.type === "string" &&
    "data" in payload;

@Injectable()
export class StripeBillingProvider extends BillingProvider {
    readonly name = BILLING_PROVIDERS.STRIPE;

    constructor(@Inject(STRIPE_CLIENT) private readonly stripe: Stripe | null) {
        super();
    }

    isConfigured(): boolean {
        return this.stripe !== null;
    }

    async retrievePrice(priceId: string): Promise<ProviderPrice> {
        const price = await this.client().prices.retrieve(priceId, { expand: ["product"] });
        if (!price.recurring) {
            throw new BadRequestException("Stripe price must be recurring (a subscription price)");
        }
        if (price.unit_amount === null) {
            throw new BadRequestException("Stripe price must have a fixed amount");
        }
        const product = price.product;
        const productName =
            typeof product === "object" && !product.deleted ? product.name : null;
        return {
            id: price.id,
            amount: centsToAmount(price.unit_amount),
            currency: price.currency.toUpperCase(),
            interval: price.recurring.interval,
            intervalCount: price.recurring.interval_count,
            active: price.active,
            productName,
        };
    }

    async retrieveSubscription(subscriptionId: string): Promise<ProviderSubscription> {
        const subscription = await this.client().subscriptions.retrieve(subscriptionId);
        return this.toSubscription(subscription);
    }

    async createCheckout(request: ProviderCheckoutRequest): Promise<{ url: string }> {
        const session = await this.client().checkout.sessions.create({
            mode: "subscription",
            line_items: [{ price: request.priceId, quantity: 1 }],
            client_reference_id: request.portalId,
            ...(request.customerId
                ? { customer: request.customerId }
                : { customer_email: request.customerEmail }),
            metadata: { portalId: request.portalId },
            // Метаданные подписки едут во все её события и счета: по ним находится портал
            subscription_data: { metadata: { portalId: request.portalId } },
            allow_promotion_codes: true,
            billing_address_collection: "auto",
            success_url: request.successUrl,
            cancel_url: request.cancelUrl,
            ...(request.locale ? { locale: request.locale } : {}),
        });
        if (!session.url) {
            throw new ServiceUnavailableException("Stripe did not return a checkout URL");
        }
        return { url: session.url };
    }

    async createManagementSession(request: ProviderManagementRequest): Promise<{ url: string }> {
        const session = await this.client().billingPortal.sessions.create({
            customer: request.customerId,
            return_url: request.returnUrl,
            ...(request.locale ? { locale: request.locale } : {}),
        });
        return { url: session.url };
    }

    parseEvent(payload: unknown): BillingProviderEvent {
        if (!isStripeEvent(payload)) {
            return { kind: "ignored" };
        }
        switch (payload.type) {
            case "checkout.session.completed": {
                const session = payload.data.object;
                if (session.mode !== "subscription") {
                    return { kind: "ignored" };
                }
                return {
                    kind: "checkout_completed",
                    portalId: session.client_reference_id ?? session.metadata?.portalId ?? null,
                    customerId: idOf(session.customer),
                    subscriptionId: idOf(session.subscription),
                };
            }
            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted":
            case "customer.subscription.paused":
            case "customer.subscription.resumed": {
                const subscription = payload.data.object;
                return {
                    kind: "subscription_changed",
                    subscriptionId: subscription.id,
                    portalId: subscription.metadata?.portalId ?? null,
                };
            }
            case "invoice.paid":
                return { kind: "invoice_paid", invoice: this.toInvoice(payload.data.object) };
            case "invoice.payment_failed": {
                const invoice = this.toInvoice(payload.data.object);
                // Статус past_due приходит в customer.subscription.updated; здесь —
                // на случай, если то событие задержится
                return invoice.subscriptionId
                    ? {
                          kind: "subscription_changed",
                          subscriptionId: invoice.subscriptionId,
                          portalId: invoice.portalId,
                      }
                    : { kind: "ignored" };
            }
            default:
                return { kind: "ignored" };
        }
    }

    private client(): Stripe {
        if (!this.stripe) {
            throw new ServiceUnavailableException("Online payments are not configured");
        }
        return this.stripe;
    }

    private toSubscription(subscription: Stripe.Subscription): ProviderSubscription {
        // Период живёт на позиции подписки (API 2025-03+); у нас одна позиция — тариф
        const item = subscription.items.data[0];
        return {
            id: subscription.id,
            customerId: idOf(subscription.customer) ?? "",
            status: subscription.status,
            priceId: item?.price.id ?? null,
            currentPeriodStart: fromUnix(item?.current_period_start),
            currentPeriodEnd: fromUnix(item?.current_period_end),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            portalId: subscription.metadata?.portalId ?? null,
        };
    }

    private toInvoice(invoice: Stripe.Invoice): ProviderInvoice {
        const details = invoice.parent?.subscription_details ?? null;
        const line = invoice.lines.data[0];
        return {
            id: invoice.id ?? "",
            subscriptionId: idOf(details?.subscription),
            customerId: idOf(invoice.customer),
            portalId: details?.metadata?.portalId ?? null,
            amountPaid: centsToAmount(invoice.amount_paid),
            currency: invoice.currency.toUpperCase(),
            paidAt: fromUnix(invoice.status_transitions.paid_at),
            periodStart: fromUnix(line?.period.start),
            periodEnd: fromUnix(line?.period.end),
        };
    }
}
