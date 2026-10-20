import { Injectable } from "@nestjs/common";

import type { PortalTypeEnum } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { PERSON_NAME_SELECT, personName } from "@modules/portal/crm/entity-fields/lib/person-name";
import { DEFAULT_PRESENCE_SETTINGS } from "@modules/portal/crm/presence/domain/presence-settings";

import { FinanceDirectory } from "../../domain/repositories/finance-sources.interface";

@Injectable()
export class FinanceDirectoryPrisma extends FinanceDirectory {
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

    /** Пояс клуба задаётся в правилах присутствия; клуб без правил живёт по Мадриду. */
    async timeZone(portalId: string): Promise<string> {
        const settings = await this.prisma.presenceSettings.findUnique({
            where: { portalId },
            select: { timezone: true },
        });
        return settings?.timezone ?? DEFAULT_PRESENCE_SETTINGS.timezone;
    }

    async memberExists(portalId: string, memberId: string): Promise<boolean> {
        return (await this.prisma.member.count({ where: { id: memberId, portalId } })) > 0;
    }

    async memberNames(
        portalId: string,
        memberIds: readonly string[]
    ): Promise<Map<string, string>> {
        if (memberIds.length === 0) return new Map();
        const rows = await this.prisma.member.findMany({
            where: { portalId, id: { in: [...memberIds] } },
            select: PERSON_NAME_SELECT,
        });
        return new Map(rows.map((row) => [row.id, personName(row)]));
    }

    async employeeNames(
        portalId: string,
        employeeIds: readonly string[]
    ): Promise<Map<string, string>> {
        if (employeeIds.length === 0) return new Map();
        const rows = await this.prisma.employee.findMany({
            where: { portalId, id: { in: [...employeeIds] } },
            select: PERSON_NAME_SELECT,
        });
        return new Map(rows.map((row) => [row.id, personName(row)]));
    }
}
