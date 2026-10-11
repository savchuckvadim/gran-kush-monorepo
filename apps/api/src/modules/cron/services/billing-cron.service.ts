import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { Prisma, SubscriptionStatus } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { BillingSettings } from "@modules/billing/application/billing-settings";
import { BILLING_PROVIDERS } from "@modules/billing/domain/billing-providers";

/** Сколько подписок разбирается за одну транзакцию: строки держат блокировку до её конца. */
const BATCH_SIZE = 100;

type LockedSubscriptionRow = { id: string };

@Injectable()
export class BillingCronService {
    private readonly logger = new Logger(BillingCronService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly settings: BillingSettings
    ) {}

    /**
     * Сроки подписок, которые не ведёт Stripe:
     * - кончился бесплатный период → past_due с льготным периодом;
     * - кончился оплаченный вручную срок → past_due с льготным периодом;
     * - кончился льготный период → expired, CRM отвечает 402.
     *
     * Портал при этом не гасится (TASK-512): suspended отвечает 404 даже на вход,
     * и клиент не смог бы попасть на страницу оплаты. Доступ закрывает гард через 402.
     *
     * Читать список и обновлять его отдельными запросами нельзя: между чтением и обновлением
     * подписку успевает оплатить вебхук, и крон гасит уже активную. На двух репликах
     * (TASK-105) к этому добавляются дубли. Поэтому строки захватываются
     * `SELECT ... FOR UPDATE SKIP LOCKED` внутри транзакции: условие проверяется уже
     * под блокировкой, а вторая реплика пропускает занятое и берёт следующую пачку.
     */
    @Cron(CronExpression.EVERY_HOUR)
    async enforceSubscriptions(): Promise<void> {
        const now = new Date();
        const pastDue = {
            status: SubscriptionStatus.past_due,
            graceEndsAt: this.settings.graceEndFrom(now),
        };

        const trials = await this.drain(
            Prisma.sql`status = ${SubscriptionStatus.trialing}::"SubscriptionStatus" AND trial_ends_at <= ${now}`,
            pastDue
        );
        const manual = await this.drain(
            Prisma.sql`status = ${SubscriptionStatus.active}::"SubscriptionStatus" AND provider = ${BILLING_PROVIDERS.MANUAL} AND current_period_end <= ${now}`,
            pastDue
        );
        const expired = await this.drain(
            Prisma.sql`status = ${SubscriptionStatus.past_due}::"SubscriptionStatus" AND grace_ends_at <= ${now}`,
            { status: SubscriptionStatus.expired }
        );

        if (trials + manual + expired > 0) {
            this.logger.log(
                `Subscriptions: ${trials} trial(s) ended, ${manual} manual period(s) ended, ${expired} expired`
            );
        }
    }

    /** Пачками, пока строки не кончатся: одна транзакция не держит блокировку на всех сразу. */
    private async drain(
        where: Prisma.Sql,
        data: Prisma.PortalSubscriptionUpdateManyMutationInput
    ): Promise<number> {
        let total = 0;
        for (;;) {
            const moved = await this.transitionBatch(where, data);
            total += moved;
            if (moved < BATCH_SIZE) return total;
        }
    }

    private async transitionBatch(
        where: Prisma.Sql,
        data: Prisma.PortalSubscriptionUpdateManyMutationInput
    ): Promise<number> {
        return this.prisma.$transaction(async (tx) => {
            const locked = await tx.$queryRaw<LockedSubscriptionRow[]>(
                Prisma.sql`
                    SELECT id
                    FROM portal_subscriptions
                    WHERE ${where}
                    ORDER BY id
                    LIMIT ${BATCH_SIZE}
                    FOR UPDATE SKIP LOCKED
                `
            );
            if (locked.length === 0) return 0;

            // Строки уже под блокировкой этой транзакции, и условие проверено в SELECT
            await tx.portalSubscription.updateMany({
                where: { id: { in: locked.map((row) => row.id) } },
                data,
            });
            return locked.length;
        });
    }
}
