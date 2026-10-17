import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { AuthSessionRepository } from "@modules/portal/auth/sessions/domain/auth-session-repository.interface";
import { AuthTokenRepository } from "@modules/portal/auth/tokens/domain/auth-token-repository.interface";

/**
 * Отозванная сессия и погашенная ссылка держатся месяц — для разбора инцидентов (кто, откуда,
 * почему отозвана, когда открыли письмо).
 */
const REVOKED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthCronService {
    private readonly logger = new Logger(AuthCronService.name);

    constructor(
        private readonly sessions: AuthSessionRepository,
        private readonly authTokens: AuthTokenRepository
    ) {}

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

    /** Уборка ссылок из писем: истёкшие и давно погашенные. Идемпотентна, как и уборка сессий. */
    @Cron(CronExpression.EVERY_DAY_AT_4AM, { timeZone: "Europe/Madrid" })
    async purgeStaleAuthTokens(): Promise<void> {
        const now = new Date();
        const count = await this.authTokens.deleteStale(
            now,
            new Date(now.getTime() - REVOKED_RETENTION_MS)
        );
        if (count > 0) {
            this.logger.log(`Purged ${count} stale email links`);
        }
    }
}
