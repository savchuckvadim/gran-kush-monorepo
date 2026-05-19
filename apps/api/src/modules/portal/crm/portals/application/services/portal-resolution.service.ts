import { Injectable, NotFoundException } from "@nestjs/common";

import { PortalStatus } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";

@Injectable()
export class PortalResolutionService {
    constructor(private readonly prisma: PrismaService) {}

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

    private ensureActive(
        portal: {
            id: string;
            name: string;
            displayName: string;
            status: PortalStatus;
        } | null
    ) {
        if (!portal) {
            throw new NotFoundException("Portal not found");
        }
        if (portal.status !== PortalStatus.active) {
            throw new NotFoundException("Portal is not available");
        }
        return portal;
    }
}
