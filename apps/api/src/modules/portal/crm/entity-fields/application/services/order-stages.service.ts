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
        return this.listStageCategories(portalId, ENTITY_DEFINITION_CODES.ORDER);
    }

    /** Воронки любой сущности портала (для конструктора и kanban). */
    async listStageCategories(
        portalId: string,
        entityCode: string
    ): Promise<OrderStageCategoryWithStages[]> {
        const entityDef = await this.prisma.entityDefinition.findUnique({
            where: {
                portalId_code: { portalId, code: entityCode },
            },
            select: { id: true },
        });
        if (!entityDef) {
            return [];
        }
        return this.prisma.stageCategory.findMany({
            where: { portalId, entityDefinitionId: entityDef.id },
            orderBy: [{ isDefault: "desc" }, { name: "asc" }],
            include: {
                stages: { orderBy: { sortOrder: "asc" } },
            },
        });
    }

    /** Создать воронку со стадиями для сущности (конструктор). */
    async createStageCategory(
        portalId: string,
        entityCode: string,
        input: {
            code: string;
            name: string;
            stages: {
                name: string;
                sortOrder: number;
                color?: string | null;
                semantic: "NEW" | "IN_PROGRESS" | "SUCCESS" | "FAILURE";
                isTerminalSuccess?: boolean;
                isTerminalFailure?: boolean;
            }[];
        }
    ): Promise<OrderStageCategoryWithStages> {
        const entityDef = await this.prisma.entityDefinition.findUniqueOrThrow({
            where: {
                portalId_code: { portalId, code: entityCode },
            },
            select: { id: true },
        });
        return this.prisma.stageCategory.create({
            data: {
                portalId,
                entityDefinitionId: entityDef.id,
                code: input.code,
                name: input.name,
                isDefault: false,
                isSystem: false,
                stages: {
                    create: input.stages.map((s) => ({
                        name: s.name,
                        sortOrder: s.sortOrder,
                        color: s.color ?? null,
                        semantic: s.semantic,
                        isTerminalSuccess: s.isTerminalSuccess ?? false,
                        isTerminalFailure: s.isTerminalFailure ?? false,
                    })),
                },
            },
            include: {
                stages: { orderBy: { sortOrder: "asc" } },
            },
        });
    }
}
