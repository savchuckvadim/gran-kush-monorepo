import { FactoryProvider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import Stripe from "stripe";

export const STRIPE_CLIENT = Symbol("STRIPE_CLIENT");

/**
 * Клиент Stripe API. Без `STRIPE_SECRET_KEY` его нет: онлайн-оплата выключена,
 * а подписки продлеваются вручную из админки.
 */
export const stripeClientProvider: FactoryProvider<Stripe | null> = {
    provide: STRIPE_CLIENT,
    inject: [ConfigService],
    useFactory: (config: ConfigService): Stripe | null => {
        const secretKey = config.get<string>("STRIPE_SECRET_KEY");
        return secretKey ? new Stripe(secretKey, { appInfo: { name: "PafPaf" } }) : null;
    },
};
