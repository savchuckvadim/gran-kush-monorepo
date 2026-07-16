import {
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Injectable,
} from "@nestjs/common";

import { SubscriptionStatus } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";

/**
 * Блокирует CRM-запросы портала при неактивной подписке (после grace / expired / canceled).
 * Просроченная подписка → 402 Payment Required; past_due в grace-периоде пропускается
 * с заголовком `X-Subscription-Warning: past_due`.
 */
@Injectable()
export class PortalCrmSubscriptionGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const http = context.switchToHttp();
        const req = http.getRequest<{ portalContext?: { portalId?: string } }>();
        const portalId = req.portalContext?.portalId;
        if (!portalId) {
            return true;
        }

        const sub = await this.prisma.portalSubscription.findUnique({
            where: { portalId },
        });
        if (!sub) {
            return true;
        }

        const now = new Date();

        if (
            sub.status === SubscriptionStatus.expired ||
            sub.status === SubscriptionStatus.canceled
        ) {
            throw new HttpException(
                "Portal subscription is not active",
                HttpStatus.PAYMENT_REQUIRED
            );
        }

        if (sub.status === SubscriptionStatus.past_due) {
            if (sub.graceEndsAt && sub.graceEndsAt < now) {
                throw new HttpException(
                    "Portal subscription grace period has ended",
                    HttpStatus.PAYMENT_REQUIRED
                );
            }
            const res = http.getResponse<{ setHeader?: (name: string, value: string) => void }>();
            res.setHeader?.("X-Subscription-Warning", "past_due");
        }

        return true;
    }
}
