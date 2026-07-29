import { Injectable, NotFoundException } from "@nestjs/common";

import { PortalStatus, PortalTypeEnum, SubscriptionStatus } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";

export type PortalInfoView = {
    id: string;
    name: string;
    displayName: string;
    type: PortalTypeEnum;
    status: PortalStatus;
    subscription: {
        status: SubscriptionStatus;
        planName: string | null;
        graceEndsAt: Date | null;
    } | null;
};

@Injectable()
export class PortalResolutionService {
    constructor(private readonly prisma: PrismaService) {}

    /** Инфо портала со статусом подписки — без фильтра active (нужно и для блок-страницы). */
    async getInfoById(portalId: string): Promise<PortalInfoView> {
        const portal = await this.prisma.portal.findUnique({
            where: { id: portalId },
            include: {
                subscription: { include: { plan: { select: { name: true } } } },
            },
        });
        if (!portal) {
            throw new NotFoundException("Portal not found");
        }
        return {
            id: portal.id,
            name: portal.name,
            displayName: portal.displayName,
            type: portal.type,
            status: portal.status,
            subscription: portal.subscription
                ? {
                      status: portal.subscription.status,
                      planName: portal.subscription.plan?.name ?? null,
                      graceEndsAt: portal.subscription.graceEndsAt,
                  }
                : null,
        };
    }

    async findActiveByIdOrSlug(portalId?: string, slug?: string) {
        if (portalId) {
            const portal = await this.prisma.portal.findUnique({ where: { id: portalId } });
            return this.ensureActive(portal);
        }
        if (slug) {
            const portal = await this.prisma.portal.findUnique({
                where: { name: slug.trim().toLowerCase() },
            });
            return this.ensureActive(portal);
        }
        return null;
    }

    private ensureActive<T extends { status: PortalStatus }>(portal: T | null): T {
        if (!portal) {
            throw new NotFoundException("Portal not found");
        }
        if (portal.status !== PortalStatus.active) {
            throw new NotFoundException("Portal is not available");
        }
        return portal;
    }
}
