import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { PresenceService } from "@presence/application/services/presence.service";

/**
 * Cron-задачи для модуля присутствия.
 *
 * 1. **Ежедневный auto-close**: В 03:00 ночи закрывает все «забытые» сессии присутствия.
 *    Участники, которые не отметили выход, автоматически «выходят» из клуба.
 *
 * 2. **Периодическая проверка**: Каждые 30 минут логирует текущее количество присутствующих
 *    для мониторинга.
 */
@Injectable()
export class PresenceCronService {
    private readonly logger = new Logger(PresenceCronService.name);

    constructor(private readonly presenceService: PresenceService) {}

    /**
     * Ежедневное авто-закрытие сессий в 03:00 по серверному времени.
     * Закрывает все активные сессии с методом выхода AUTO_CRON.
     */
    @Cron(CronExpression.EVERY_DAY_AT_3AM, {
        name: "presence-auto-close",
        timeZone: "Europe/Madrid", // Испания (Барселона)
    })
    async handleAutoClose(): Promise<void> {
        this.logger.log("⏰ Запуск авто-закрытия сессий присутствия...");

        try {
            const closedCount = await this.presenceService.autoCloseAllSessions();

            if (closedCount > 0) {
                this.logger.warn(`⚠️ Auto-close: закрыто ${closedCount} «забытых» сессий`);
            } else {
                this.logger.log("✅ Auto-close: нет забытых сессий, всё в порядке");
            }
        } catch (error) {
            this.logger.error(
                `❌ Ошибка при авто-закрытии сессий: ${error}`,
                (error as Error).stack
            );
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
