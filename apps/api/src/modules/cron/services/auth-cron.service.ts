import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { AuthSessionRepository } from "@modules/portal/auth/sessions/domain/auth-session-repository.interface";

/** Отозванная сессия держится месяц — для разбора инцидентов (кто, откуда, почему отозвана). */
const REVOKED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthCronService {
    private readonly logger = new Logger(AuthCronService.name);

    constructor(private readonly sessions: AuthSessionRepository) {}

    /**
     * Уборка сессий: истёкшие и давно отозванные. Идемпотентна: повторный прогон на второй реплике
     * не найдёт строк.
     */
    @Cron(CronExpression.EVERY_DAY_AT_4AM, { timeZone: "Europe/Madrid" })
    async purgeStaleSessions(): Promise<void> {
        const now = new Date();
        const count = await this.sessions.deleteStale(
            now,
            new Date(now.getTime() - REVOKED_RETENTION_MS)
        );
        if (count > 0) {
            this.logger.log(`Purged ${count} stale sessions`);
        }
    }
}
