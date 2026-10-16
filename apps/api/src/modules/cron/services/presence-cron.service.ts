import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { PresenceService } from "@modules/portal/crm/presence/application/services/presence.service";
import { PresenceSettingsService } from "@modules/portal/crm/presence/application/services/presence-settings.service";

/**
 * Cron-задачи для модуля присутствия.
 *
 * 1. **Авто-выход**: закрывает «забытые» визиты по правилам клуба (`presence_settings`:
 *    часовой пояс, время авто-выхода, потолок длительности; без настроек — 03:00 по Мадриду).
 *
 * 2. **Периодическая проверка**: Каждые 30 минут логирует текущее количество присутствующих
 *    для мониторинга.
 *
 * Обе задачи безопасны на нескольких репликах (TASK-105): авто-выход закрывает визиты
 * одним условным UPDATE, а status-log только читает. Дубль на второй реплике даёт
 * ноль закрытых строк и лишнюю строку в логе, но не переписывает чужие данные.
 */
@Injectable()
export class PresenceCronService {
    private readonly logger = new Logger(PresenceCronService.name);

    constructor(
        private readonly presenceService: PresenceService,
        private readonly presenceSettings: PresenceSettingsService
    ) {}

    /**
     * Авто-выход забытых визитов по правилам каждого клуба (часовой пояс, время, потолок —
     * `presence_settings`). Запуск каждые 10 минут: клуб получает авто-выход не позже чем через
     * 10 минут после своего времени, а время выхода записывается моментом правила.
     */
    @Cron(CronExpression.EVERY_10_MINUTES, { name: "presence-auto-exit" })
    async handleAutoExit(): Promise<void> {
        try {
            await this.presenceSettings.closeDueSessions();
        } catch (error) {
            this.logger.error(`❌ Ошибка авто-выхода визитов: ${error}`, (error as Error).stack);
        }
    }

    /**
     * Логирование текущего количества присутствующих каждые 30 минут.
     * Полезно для мониторинга и отладки.
     */
    @Cron(CronExpression.EVERY_30_MINUTES, {
        name: "presence-status-log",
    })
    async handlePresenceStatusLog(): Promise<void> {
        try {
            const currentlyPresent = await this.presenceService.countCurrentlyPresent();

            if (currentlyPresent > 0) {
                this.logger.log(`📊 Текущее количество присутствующих: ${currentlyPresent}`);
            }
        } catch (error) {
            this.logger.error(
                `❌ Ошибка при логировании статуса: ${error}`,
                (error as Error).stack
            );
        }
    }
}
