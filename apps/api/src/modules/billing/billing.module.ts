import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";

import { PlatformBillingPlansController } from "./api/controllers/platform-billing-plans.controller";
import { BillingPlansService } from "./application/services/billing-plans.service";
import { PaymentEventsService } from "./application/services/payment-events.service";
import { PaymentsService } from "./application/services/payments.service";
import { BillingPlanRepository } from "./domain/repositories/billing-plan-repository.interface";
import { BillingPlanPrismaRepository } from "./infrastructure/repositories/billing-plan-prisma.repository";

/**
 * Биллинг платформы: публичный каталог тарифов и ядро идемпотентности оплаты —
 * журнал событий провайдера и запись платежей.
 *
 * Контроллера вебхука здесь пока нет — маршрут и адаптер подписи появляются вместе
 * с выбранным провайдером, регистрацией `PAYMENT_WEBHOOK_VERIFIERS`. До тех пор
 * `PaymentEventsService.ingest` отклоняет любой запрос: проверять подпись нечем.
 */
@Module({
    imports: [PrismaModule],
    controllers: [PlatformBillingPlansController],
    providers: [
        PaymentsService,
        PaymentEventsService,
        BillingPlansService,
        { provide: BillingPlanRepository, useClass: BillingPlanPrismaRepository },
    ],
    exports: [PaymentsService, PaymentEventsService],
})
export class BillingModule {}
