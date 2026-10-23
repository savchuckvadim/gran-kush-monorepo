import { FactoryProvider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import Stripe from "stripe";

import { BrandService } from "@common/brand/brand.service";

export const STRIPE_CLIENT = Symbol("STRIPE_CLIENT");

/**
 * Клиент Stripe API. Без `STRIPE_SECRET_KEY` его нет: онлайн-оплата выключена,
 * а подписки продлеваются вручную из админки.
 */
export const stripeClientProvider: FactoryProvider<Stripe | null> = {
    provide: STRIPE_CLIENT,
    inject: [ConfigService, BrandService],
    useFactory: (config: ConfigService, brand: BrandService): Stripe | null => {
        const secretKey = config.get<string>("STRIPE_SECRET_KEY");
        return secretKey ? new Stripe(secretKey, { appInfo: { name: brand.brand.name } }) : null;
    },
};
