import {
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Injectable,
} from "@nestjs/common";

import { PrismaService } from "@common/prisma/prisma.service";
import {
    type SubscriptionAccess,
    subscriptionAccess,
} from "@modules/billing/domain/subscription-access";

const CLOSED_MESSAGES: Partial<Record<SubscriptionAccess, string>> = {
    missing: "Portal has no subscription",
    inactive: "Portal subscription is not active",
    grace_ended: "Portal subscription grace period has ended",
};

/**
 * Блокирует CRM-запросы портала при неактивной подписке (после grace / expired / canceled).
 * Просроченная подписка → 402 Payment Required; past_due в grace-периоде пропускается
 * с заголовком `X-Subscription-Warning: past_due`. Правила — `subscriptionAccess`.
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
            select: { status: true, graceEndsAt: true },
        });
        const access = subscriptionAccess(sub);
        const closed = CLOSED_MESSAGES[access];
        if (closed) {
            throw new HttpException(closed, HttpStatus.PAYMENT_REQUIRED);
        }
        if (access === "grace") {
            const res = http.getResponse<{ setHeader?: (name: string, value: string) => void }>();
            res.setHeader?.("X-Subscription-Warning", "past_due");
        }
        return true;
    }
}
