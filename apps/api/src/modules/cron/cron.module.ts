import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";

import { PresenceModule } from "@presence/presence.module";

import { PresenceCronService } from "./services/presence-cron.service";

/**
 * Модуль Cron-задач.
 *
 * Подключает @nestjs/schedule и регистрирует все cron-сервисы:
 * - PresenceCronService: авто-закрытие сессий, мониторинг присутствующих
 *
 * Все cron-задачи используют Europe/Madrid (Испания) в качестве таймзоны.
 */
@Module({
    imports: [ScheduleModule.forRoot(), PresenceModule],
    providers: [PresenceCronService],
})
export class CronModule {}
