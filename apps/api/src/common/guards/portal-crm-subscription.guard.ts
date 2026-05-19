import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";

import { SubscriptionStatus } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";

/**
 * Блокирует CRM-запросы портала при неактивной подписке (после grace / expired / canceled).
 */
@Injectable()
export class PortalCrmSubscriptionGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest<{ portalId?: string }>();
        const portalId = req.portalId;
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
            throw new ForbiddenException("Portal subscription is not active");
        }

        if (
            sub.status === SubscriptionStatus.past_due &&
            sub.graceEndsAt &&
            sub.graceEndsAt < now
        ) {
            throw new ForbiddenException("Portal subscription grace period has ended");
        }

        return true;
    }
}
