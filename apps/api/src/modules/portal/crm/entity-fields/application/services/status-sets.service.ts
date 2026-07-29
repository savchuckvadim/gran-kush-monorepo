import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "@common/prisma/prisma.service";

export type StatusItemView = {
    id: string;
    statusSetId: string;
    key: string;
    label: string;
    color: string | null;
    sortOrder: number;
    isActive: boolean;
    isSystem: boolean;
    semantic: string | null;
};

export type StatusSetView = {
    id: string;
    code: string;
    isSystem: boolean;
    isImmutable: boolean;
    items: StatusItemView[];
};

const statusItemSelect = {
    id: true,
    statusSetId: true,
    key: true,
    label: true,
    color: true,
    sortOrder: true,
    isActive: true,
    isSystem: true,
    semantic: true,
} as const;

@Injectable()
export class StatusSetsService {
    constructor(private readonly prisma: PrismaService) {}

    private async resolveEntityDefinitionId(portalId: string, entityCode: string): Promise<string> {
        const definition = await this.prisma.entityDefinition.findUnique({
            where: { portalId_code: { portalId, code: entityCode } },
            select: { id: true },
        });
        if (!definition) {
            throw new NotFoundException(`Entity "${entityCode}" not found`);
        }
        return definition.id;
    }

    async listStatusSets(portalId: string, entityCode: string): Promise<StatusSetView[]> {
        const entityDefinitionId = await this.resolveEntityDefinitionId(portalId, entityCode);
        return this.prisma.statusSet.findMany({
            where: { portalId, entityDefinitionId },
            orderBy: { code: "asc" },
            select: {
                id: true,
                code: true,
                isSystem: true,
                isImmutable: true,
                items: { orderBy: { sortOrder: "asc" }, select: statusItemSelect },
            },
        });
    }

    async createStatusSet(
        portalId: string,
        entityCode: string,
        input: {
            code: string;
            items: { key: string; label: string; color?: string | null; sortOrder?: number }[];
        }
    ): Promise<StatusSetView> {
        const entityDefinitionId = await this.resolveEntityDefinitionId(portalId, entityCode);

        const existing = await this.prisma.statusSet.findUnique({
            where: {
                portalId_entityDefinitionId_code: {
                    portalId,
                    entityDefinitionId,
                    code: input.code,
                },
            },
            select: { id: true },
        });
        if (existing) {
            throw new BadRequestException(`Status set "${input.code}" already exists`);
        }

        return this.prisma.statusSet.create({
            data: {
                portalId,
                entityDefinitionId,
                code: input.code,
                isSystem: false,
                isImmutable: false,
                items: {
                    create: input.items.map((item, index) => ({
                        key: item.key,
                        label: item.label,
                        color: item.color ?? null,
                        sortOrder: item.sortOrder ?? index,
                        isActive: true,
                        isSystem: false,
                    })),
                },
            },
            select: {
                id: true,
                code: true,
                isSystem: true,
                isImmutable: true,
                items: { orderBy: { sortOrder: "asc" }, select: statusItemSelect },
            },
        });
    }

    private async findSetInPortal(portalId: string, entityCode: string, statusSetId: string) {
        const entityDefinitionId = await this.resolveEntityDefinitionId(portalId, entityCode);
        const set = await this.prisma.statusSet.findFirst({
            where: { id: statusSetId, portalId, entityDefinitionId },
            select: { id: true, isImmutable: true },
        });
        if (!set) {
            throw new NotFoundException("Status set not found");
        }
        return set;
    }

    async addStatusItem(
        portalId: string,
        entityCode: string,
        statusSetId: string,
        input: { key: string; label: string; color?: string | null; sortOrder?: number }
    ): Promise<StatusItemView> {
        const set = await this.findSetInPortal(portalId, entityCode, statusSetId);
        if (set.isImmutable) {
            throw new BadRequestException("Status set is immutable");
        }

        const duplicate = await this.prisma.statusItem.findUnique({
            where: { statusSetId_key: { statusSetId, key: input.key } },
            select: { id: true },
        });
        if (duplicate) {
            throw new BadRequestException(`Status "${input.key}" already exists in this set`);
        }

        const maxSort = await this.prisma.statusItem.aggregate({
            where: { statusSetId },
            _max: { sortOrder: true },
        });

        return this.prisma.statusItem.create({
            data: {
                statusSetId,
                key: input.key,
                label: input.label,
                color: input.color ?? null,
                sortOrder: input.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1,
                isActive: true,
                isSystem: false,
            },
            select: statusItemSelect,
        });
    }

    async updateStatusItem(
        portalId: string,
        entityCode: string,
        statusSetId: string,
        itemId: string,
        input: {
            label?: string;
            color?: string | null;
            sortOrder?: number;
            isActive?: boolean;
        }
    ): Promise<StatusItemView> {
        await this.findSetInPortal(portalId, entityCode, statusSetId);

        const item = await this.prisma.statusItem.findFirst({
            where: { id: itemId, statusSetId },
            select: { id: true },
        });
        if (!item) {
            throw new NotFoundException("Status item not found");
        }

        return this.prisma.statusItem.update({
            where: { id: itemId },
            data: {
                ...(input.label !== undefined ? { label: input.label } : {}),
                ...(input.color !== undefined ? { color: input.color } : {}),
                ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
                ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
            },
            select: statusItemSelect,
        });
    }

    async deleteStatusItem(
        portalId: string,
        entityCode: string,
        statusSetId: string,
        itemId: string
    ): Promise<void> {
        await this.findSetInPortal(portalId, entityCode, statusSetId);

        const item = await this.prisma.statusItem.findFirst({
            where: { id: itemId, statusSetId },
            select: { id: true, isSystem: true, _count: { select: { entityRecords: true } } },
        });
        if (!item) {
            throw new NotFoundException("Status item not found");
        }
        if (item.isSystem) {
            throw new BadRequestException("System status cannot be deleted — deactivate it");
        }
        if (item._count.entityRecords > 0) {
            throw new BadRequestException(
                "Status is used by records — deactivate it instead of deleting"
            );
        }

        await this.prisma.statusItem.delete({ where: { id: itemId } });
    }
}
