import { Controller, Headers, HttpCode, Param, Post } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";

import { Public } from "@common/decorators/auth/public.decorator";
import { RawBody } from "@common/decorators/request/raw-body.decorator";
import { PaymentEventsService } from "@modules/billing/application/services/payment-events.service";
import { SubscriptionSyncService } from "@modules/billing/application/services/subscription-sync.service";

class PaymentWebhookAckDto {
    @ApiProperty({ type: Boolean })
    received: boolean;

    @ApiProperty({ type: String, enum: ["processed", "duplicate"] })
    outcome: string;
}

@ApiTags("Platform — тарифы")
@Controller("platform/billing/webhooks")
@Public()
// Подпись проверяется до любой работы, а Stripe шлёт пачки событий разом: общий лимит
// резал бы настоящие вебхуки, а не атаку
@SkipThrottle()
export class PlatformBillingWebhooksController {
    constructor(
        private readonly paymentEvents: PaymentEventsService,
        private readonly subscriptionSync: SubscriptionSyncService
    ) {}

    @Post(":provider")
    @HttpCode(200)
    @ApiOperation({
        summary: "Вебхук платёжного провайдера (Stripe: /platform/billing/webhooks/stripe)",
        description:
            "Без подписи провайдера — 401. Ошибка обработки — 5xx, и провайдер повторит доставку.",
    })
    @ApiOkResponse({ type: PaymentWebhookAckDto })
    async receive(
        @Param("provider") provider: string,
        @RawBody() rawBody: string,
        @Headers() headers: Record<string, string | string[] | undefined>
    ): Promise<PaymentWebhookAckDto> {
        const result = await this.paymentEvents.ingest(
            { provider, rawBody, headers },
            (_tx, event) => this.subscriptionSync.handle(event)
        );
        return { received: true, outcome: result.outcome };
    }
}
