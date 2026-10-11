import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import Stripe from "stripe";

import { BILLING_PROVIDERS } from "@modules/billing/domain/billing-providers";
import {
    PaymentEventInput,
    PaymentWebhookRequest,
    PaymentWebhookVerifier,
} from "@modules/billing/domain/payment-webhook.types";

/** Подпись Stripe (`Stripe-Signature`) проверяется по сырому телу и `STRIPE_WEBHOOK_SECRET`. */
@Injectable()
export class StripeWebhookVerifier implements PaymentWebhookVerifier {
    readonly provider = BILLING_PROVIDERS.STRIPE;
    private readonly webhookSecret: string | undefined;

    constructor(config: ConfigService) {
        this.webhookSecret = config.get<string>("STRIPE_WEBHOOK_SECRET");
    }

    parseVerified(request: PaymentWebhookRequest): PaymentEventInput {
        // Fail-closed: без секрета принять событие нельзя, проверять подпись нечем
        if (!this.webhookSecret) {
            throw new UnauthorizedException("Stripe webhooks are not configured");
        }
        const signature = request.headers["stripe-signature"];
        if (typeof signature !== "string") {
            throw new UnauthorizedException("Missing Stripe signature");
        }

        let event: Stripe.Event;
        try {
            event = Stripe.webhooks.constructEvent(request.rawBody, signature, this.webhookSecret);
        } catch {
            throw new UnauthorizedException("Invalid Stripe signature");
        }

        return {
            eventId: event.id,
            type: event.type,
            // В журнал — тело ровно как пришло, без пересборки через типы SDK
            payload: JSON.parse(request.rawBody),
        };
    }
}
