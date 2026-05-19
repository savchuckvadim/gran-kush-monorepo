import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { PortalStatus, SubscriptionStatus } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";

@Injectable()
export class BillingCronService {
    private readonly logger = new Logger(BillingCronService.name);

    constructor(private readonly prisma: PrismaService) {}

    /** Перевод past_due после grace → expired и приостановка портала. */
    @Cron(CronExpression.EVERY_HOUR)
    async enforceSubscriptionGrace(): Promise<void> {
        const now = new Date();
        const due = await this.prisma.portalSubscription.findMany({
            where: {
                status: SubscriptionStatus.past_due,
                graceEndsAt: { lte: now },
            },
        });

        for (const sub of due) {
            await this.prisma.$transaction([
                this.prisma.portalSubscription.update({
                    where: { id: sub.id },
                    data: { status: SubscriptionStatus.expired },
                }),
                this.prisma.portal.update({
                    where: { id: sub.portalId },
                    data: { status: PortalStatus.suspended },
                }),
            ]);
            this.logger.log(`Subscription expired for portal ${sub.portalId}`);
        }
    }
}
