import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { IdempotencyService } from "@common/idempotency";

@Injectable()
export class IdempotencyCronService {
    private readonly logger = new Logger(IdempotencyCronService.name);

    constructor(private readonly idempotency: IdempotencyService) {}

    /**
     * Уборка протухших ключей. Сама по себе идемпотентна — повторный прогон на второй
     * реплике (TASK-105) просто не найдёт строк, ничего не ломая.
     */
    @Cron(CronExpression.EVERY_DAY_AT_4AM)
    async purgeExpiredKeys(): Promise<void> {
        const removed = await this.idempotency.purgeExpired();
        if (removed > 0) {
            this.logger.log(`Purged ${removed} expired idempotency keys`);
        }
    }
}
