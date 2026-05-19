import { Injectable, NotFoundException } from "@nestjs/common";

import { Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";

import { ProvisionPortalFromTemplatesService } from "./provision-portal-from-templates.service";

type Tx = Prisma.TransactionClient;

/**
 * @deprecated Используйте {@link ProvisionPortalFromTemplatesService}; метод сохранён для совместимости вызовов.
 */
@Injectable()
export class PortalEntityMetadataService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly provision: ProvisionPortalFromTemplatesService
    ) {}

    async seedForPortal(portalId: string, tx?: Tx): Promise<void> {
        const db = tx ?? this.prisma;
        const portal = await db.portal.findUnique({
            where: { id: portalId },
            select: { type: true },
        });
        if (!portal) {
            throw new NotFoundException(`Portal ${portalId} not found`);
        }
        await this.provision.provisionPortal(portalId, portal.type, tx);
    }
}
