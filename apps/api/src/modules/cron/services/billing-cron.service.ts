import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { PortalStatus, Prisma, SubscriptionStatus } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";

/** Сколько подписок разбирается за одну транзакцию: строки держат блокировку до её конца. */
const BATCH_SIZE = 100;

type LockedSubscriptionRow = { id: string; portal_id: string };

@Injectable()
export class BillingCronService {
    private readonly logger = new Logger(BillingCronService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * Перевод past_due после grace → expired и приостановка портала.
     *
     * Читать список и обновлять его отдельными запросами нельзя: между чтением и обновлением
     * подписку успевает оплатить вебхук, и крон гасит уже активный портал. На двух репликах
     * (TASK-105) к этому добавляются дубли — оба инстанса видят одни и те же строки.
     *
     * Поэтому строки захватываются `SELECT ... FOR UPDATE SKIP LOCKED` внутри транзакции:
     * условие `status = past_due` проверяется уже под блокировкой, а вторая реплика
     * не ждёт первую, а пропускает занятое и берёт следующую пачку.
     */
    @Cron(CronExpression.EVERY_HOUR)
    async enforceSubscriptionGrace(): Promise<void> {
        const now = new Date();
        let total = 0;

        // Пачками, пока строки не кончатся: одна транзакция не должна держать
        // блокировку на всех просроченных подписках сразу.
        for (;;) {
            const expired = await this.expireBatch(now);
            total += expired;
            if (expired < BATCH_SIZE) break;
        }

        if (total > 0) {
            this.logger.log(`Grace enforced: ${total} subscription(s) expired`);
        }
    }

    private async expireBatch(now: Date): Promise<number> {
        return this.prisma.$transaction(async (tx) => {
            const locked = await tx.$queryRaw<LockedSubscriptionRow[]>(
                Prisma.sql`
                    SELECT id, portal_id
                    FROM portal_subscriptions
                    WHERE status = ${SubscriptionStatus.past_due}::"SubscriptionStatus"
                      AND grace_ends_at <= ${now}
                    ORDER BY grace_ends_at
                    LIMIT ${BATCH_SIZE}
                    FOR UPDATE SKIP LOCKED
                `
            );

            if (locked.length === 0) return 0;

            const subscriptionIds = locked.map((row) => row.id);
            const portalIds = locked.map((row) => row.portal_id);

            // Строки уже под блокировкой этой транзакции, и условие статуса проверено
            // в SELECT — повторно сравнивать его в UPDATE не нужно.
            await tx.portalSubscription.updateMany({
                where: { id: { in: subscriptionIds } },
                data: { status: SubscriptionStatus.expired },
            });
            await tx.portal.updateMany({
                where: { id: { in: portalIds } },
                data: { status: PortalStatus.suspended },
            });

            for (const portalId of portalIds) {
                this.logger.log(`Subscription expired for portal ${portalId}`);
            }

            return locked.length;
        });
    }
}
