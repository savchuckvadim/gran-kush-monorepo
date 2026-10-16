import { Injectable } from "@nestjs/common";

import { PrismaService } from "@common/prisma/prisma.service";

import { PortalAppearanceRepository } from "../../domain/repositories/portal-appearance-repository.interface";

@Injectable()
export class PortalAppearancePrismaRepository implements PortalAppearanceRepository {
    constructor(private readonly prisma: PrismaService) {}

    async saveDefaultSkin(portalId: string, skin: string | null): Promise<boolean> {
        const { count } = await this.prisma.portal.updateMany({
            where: { id: portalId },
            data: { defaultSkin: skin },
        });
        return count > 0;
    }
}
