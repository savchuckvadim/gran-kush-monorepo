import { Injectable } from "@nestjs/common";

import type { PortalTypeEnum } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import type { OutboxTransaction } from "@modules/events";

import type { PortalModuleCode } from "../domain/portal-module.catalog";
import {
    type EnabledPortalModule,
    PortalModuleRepository,
} from "../domain/portal-module-repository.interface";

@Injectable()
export class PortalModulePrismaRepository extends PortalModuleRepository {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async portalType(portalId: string): Promise<PortalTypeEnum | null> {
        const portal = await this.prisma.portal.findUnique({
            where: { id: portalId },
            select: { type: true },
        });
        return portal?.type ?? null;
    }

    findEnabled(portalId: string): Promise<EnabledPortalModule[]> {
        return this.prisma.portalModule.findMany({
            where: { portalId },
            select: { code: true, enabledAt: true },
            orderBy: { code: "asc" },
        });
    }

    async isEnabled(portalId: string, code: PortalModuleCode): Promise<boolean> {
        const row = await this.prisma.portalModule.findUnique({
            where: { portalId_code: { portalId, code } },
            select: { code: true },
        });
        return row !== null;
    }

    setEnabled(
        change: { portalId: string; code: PortalModuleCode; enabled: boolean; employeeId: string },
        within: (tx: OutboxTransaction) => Promise<void>
    ): Promise<boolean> {
        const { portalId, code, enabled, employeeId } = change;
        return this.prisma.$transaction(async (tx) => {
            const changed = enabled
                ? (
                      await tx.portalModule.createMany({
                          data: [{ portalId, code, enabledByEmployeeId: employeeId }],
                          skipDuplicates: true,
                      })
                  ).count === 1
                : (await tx.portalModule.deleteMany({ where: { portalId, code } })).count === 1;
            if (changed) await within(tx);
            return changed;
        });
    }
}
