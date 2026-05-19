import { Injectable } from "@nestjs/common";

import { Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { ENTITY_DEFINITION_CODES } from "@modules/portal/crm/entity-fields/constants/entity-definition-codes";

export type OrderStageCategoryWithStages = Prisma.StageCategoryGetPayload<{
    include: {
        stages: { orderBy: { sortOrder: "asc" } };
    };
}>;

const ORDER_STATUS_TO_STAGE_NAME: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    preparing: "Preparing",
    ready: "Ready",
    completed: "Completed",
    cancelled: "Cancelled",
};

@Injectable()
export class OrderStagesService {
    constructor(private readonly prisma: PrismaService) {}

    async getStageIdForOrderStatus(
        portalId: string,
        orderStatusLower: string
    ): Promise<string | null> {
        const orderDef = await this.prisma.entityDefinition.findUnique({
            where: {
                portalId_code: { portalId, code: ENTITY_DEFINITION_CODES.ORDER },
            },
            select: { id: true },
        });
        if (!orderDef) {
            return null;
        }

        const stageName = ORDER_STATUS_TO_STAGE_NAME[orderStatusLower.toLowerCase()] ?? "Pending";
        const stage = await this.prisma.stage.findFirst({
            where: {
                name: { equals: stageName, mode: "insensitive" },
                stageCategory: {
                    portalId,
                    entityDefinitionId: orderDef.id,
                    code: "default",
                },
            },
            select: { id: true },
        });
        return stage?.id ?? null;
    }

    async resolvePortalIdForMember(memberId: string): Promise<string | null> {
        const m = await this.prisma.member.findUnique({
            where: { id: memberId },
            select: { portalId: true },
        });
        return m?.portalId ?? null;
    }

    async listOrderStageCategories(portalId: string): Promise<OrderStageCategoryWithStages[]> {
        const orderDef = await this.prisma.entityDefinition.findUnique({
            where: {
                portalId_code: { portalId, code: ENTITY_DEFINITION_CODES.ORDER },
            },
            select: { id: true },
        });
        if (!orderDef) {
            return [];
        }
        return this.prisma.stageCategory.findMany({
            where: { portalId, entityDefinitionId: orderDef.id },
            orderBy: [{ isDefault: "desc" }, { name: "asc" }],
            include: {
                stages: { orderBy: { sortOrder: "asc" } },
            },
        });
    }
}
