import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";

import { PrismaModule } from "@common/prisma/prisma.module";
import { BillingModule } from "@modules/billing/billing.module";
import { PresenceModule } from "@modules/portal/crm/presence/presence.module";

import { AuthCronService } from "./services/auth-cron.service";
import { BillingCronService } from "./services/billing-cron.service";
import { IdempotencyCronService } from "./services/idempotency-cron.service";
import { PresenceCronService } from "./services/presence-cron.service";

/**
 * Модуль Cron-задач.
 *
 * Подключает @nestjs/schedule и регистрирует все cron-сервисы:
 * - PresenceCronService: авто-закрытие сессий, мониторинг присутствующих
 * - BillingCronService: истечение grace-периода подписки и приостановка портала
 * - IdempotencyCronService: уборка протухших ключей идемпотентности
 * - AuthCronService: уборка протухших и давно отозванных refresh-токенов
 *
 * Расписание живёт в каждом процессе, поэтому каждая задача рассчитана на запуск
 * на нескольких репликах одновременно (TASK-105) — см. комментарии в сервисах.
 *
 * Все cron-задачи используют Europe/Madrid (Испания) в качестве таймзоны.
 */
@Module({
    imports: [ScheduleModule.forRoot(), PrismaModule, PresenceModule, BillingModule],
    providers: [PresenceCronService, BillingCronService, IdempotencyCronService, AuthCronService],
})
export class CronModule {}
