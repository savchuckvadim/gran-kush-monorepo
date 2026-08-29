import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";

import { PrismaModule } from "@common/prisma/prisma.module";
import { PresenceModule } from "@modules/portal/crm/presence/presence.module";

import { BillingCronService } from "./services/billing-cron.service";
import { IdempotencyCronService } from "./services/idempotency-cron.service";
import { PresenceCronService } from "./services/presence-cron.service";

/**
 * Модуль Cron-задач.
 *
 * Подключает @nestjs/schedule и регистрирует все cron-сервисы:
 * - PresenceCronService: авто-закрытие сессий, мониторинг присутствующих
 * - IdempotencyCronService: уборка протухших ключей идемпотентности
 *
 * Все cron-задачи используют Europe/Madrid (Испания) в качестве таймзоны.
 */
@Module({
    imports: [ScheduleModule.forRoot(), PrismaModule, PresenceModule],
    providers: [PresenceCronService, BillingCronService, IdempotencyCronService],
})
export class CronModule {}
