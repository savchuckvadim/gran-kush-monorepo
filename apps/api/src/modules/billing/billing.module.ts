import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { PrismaModule } from "@common/prisma/prisma.module";

import { CrmBillingController } from "./api/controllers/crm-billing.controller";
import { PlatformAdminBillingController } from "./api/controllers/platform-admin-billing.controller";
import { PlatformBillingPlansController } from "./api/controllers/platform-billing-plans.controller";
import { PlatformBillingWebhooksController } from "./api/controllers/platform-billing-webhooks.controller";
import { BillingSettings } from "./application/billing-settings";
import { AdminBillingService } from "./application/services/admin-billing.service";
import { BillingPlansService } from "./application/services/billing-plans.service";
import { PaymentEventsService } from "./application/services/payment-events.service";
import { PaymentsService } from "./application/services/payments.service";
import { PortalBillingService } from "./application/services/portal-billing.service";
import { SubscriptionSyncService } from "./application/services/subscription-sync.service";
import { BillingProvider } from "./domain/billing-provider.interface";
import { PAYMENT_WEBHOOK_VERIFIERS } from "./domain/payment-webhook.types";
import { BillingPlanRepository } from "./domain/repositories/billing-plan-repository.interface";
import { PortalSubscriptionRepository } from "./domain/repositories/portal-subscription-repository.interface";
import { BillingPlanPrismaRepository } from "./infrastructure/repositories/billing-plan-prisma.repository";
import { PortalSubscriptionPrismaRepository } from "./infrastructure/repositories/portal-subscription-prisma.repository";
import { StripeBillingProvider } from "./infrastructure/stripe/stripe-billing.provider";
import { stripeClientProvider } from "./infrastructure/stripe/stripe.client";
import { StripeWebhookVerifier } from "./infrastructure/stripe/stripe-webhook.verifier";

/**
 * Биллинг платформы: каталог тарифов, оплата подписки клуба через Stripe
 * (Checkout + Customer Portal + вебхуки), ручное продление из админки и ядро
 * идемпотентности оплаты — журнал событий провайдера и запись платежей.
 *
 * Без `STRIPE_SECRET_KEY` онлайн-оплата выключена, без `STRIPE_WEBHOOK_SECRET`
 * вебхук отвечает 401 — остальной биллинг работает.
 */
@Module({
    imports: [PrismaModule, ConfigModule],
    controllers: [
        PlatformBillingPlansController,
        PlatformBillingWebhooksController,
        PlatformAdminBillingController,
        CrmBillingController,
    ],
    providers: [
        BillingSettings,
        PaymentsService,
        PaymentEventsService,
        BillingPlansService,
        AdminBillingService,
        PortalBillingService,
        SubscriptionSyncService,
        stripeClientProvider,
        StripeWebhookVerifier,
        { provide: BillingProvider, useClass: StripeBillingProvider },
        {
            provide: PAYMENT_WEBHOOK_VERIFIERS,
            useFactory: (stripe: StripeWebhookVerifier) => [stripe],
            inject: [StripeWebhookVerifier],
        },
        { provide: BillingPlanRepository, useClass: BillingPlanPrismaRepository },
        { provide: PortalSubscriptionRepository, useClass: PortalSubscriptionPrismaRepository },
    ],
    exports: [PaymentsService, PaymentEventsService, BillingSettings],
})
export class BillingModule {}
