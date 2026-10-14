import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { PrismaService } from "@common/prisma/prisma.service";

/** Отозванная строка держится, пока живёт её «законный» срок: после него она бесполезна и для аудита. */
const REVOKED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthCronService {
    private readonly logger = new Logger(AuthCronService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * Уборка refresh-токенов: протухшие и давно отозванные строки. Без неё таблица росла
     * бесконечно — веб-клиент без X-Device-Id создаёт новую строку на каждый вход.
     * Идемпотентна: повторный прогон на второй реплике не найдёт строк.
     */
    @Cron(CronExpression.EVERY_DAY_AT_4AM, { timeZone: "Europe/Madrid" })
    async purgeStaleRefreshTokens(): Promise<void> {
        const revokedBefore = new Date(Date.now() - REVOKED_RETENTION_MS);
        const { count } = await this.prisma.refreshToken.deleteMany({
            where: {
                OR: [
                    { expiresAt: { lt: new Date() } },
                    { revoked: true, createdAt: { lt: revokedBefore } },
                ],
            },
        });
        if (count > 0) {
            this.logger.log(`Purged ${count} stale refresh tokens`);
        }
    }
}
