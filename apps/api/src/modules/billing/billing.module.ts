import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";

import { PaymentEventsService } from "./application/services/payment-events.service";
import { PaymentsService } from "./application/services/payments.service";

/**
 * Ядро идемпотентности оплаты: журнал событий провайдера и запись платежей.
 *
 * Контроллера вебхука здесь пока нет — маршрут и адаптер подписи появляются вместе
 * с выбранным провайдером, регистрацией `PAYMENT_WEBHOOK_VERIFIERS`. До тех пор
 * `PaymentEventsService.ingest` отклоняет любой запрос: проверять подпись нечем.
 */
@Module({
    imports: [PrismaModule],
    providers: [PaymentsService, PaymentEventsService],
    exports: [PaymentsService, PaymentEventsService],
})
export class BillingModule {}
