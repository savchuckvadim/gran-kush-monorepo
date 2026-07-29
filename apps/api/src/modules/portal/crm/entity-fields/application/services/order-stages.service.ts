import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

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

    /** Обновить воронку: имя + upsert стадий (стадии без id создаются, отсутствующие удаляются). */
    async updateStageCategory(
        portalId: string,
        entityCode: string,
        categoryId: string,
        input: {
            name?: string;
            stages?: {
                id?: string;
                name: string;
                sortOrder: number;
                color?: string | null;
                semantic: "NEW" | "IN_PROGRESS" | "SUCCESS" | "FAILURE";
                isTerminalSuccess?: boolean;
                isTerminalFailure?: boolean;
            }[];
        }
    ): Promise<OrderStageCategoryWithStages> {
        const category = await this.findCategoryInPortal(portalId, entityCode, categoryId);

        return this.prisma.$transaction(async (tx) => {
            if (input.name !== undefined) {
                await tx.stageCategory.update({
                    where: { id: category.id },
                    data: { name: input.name },
                });
            }

            if (input.stages !== undefined) {
                const keptIds = input.stages
                    .map((s) => s.id)
                    .filter((id): id is string => Boolean(id));

                // Записи на удаляемых стадиях теряют stageId (SetNull)
                await tx.stage.deleteMany({
                    where: { stageCategoryId: category.id, id: { notIn: keptIds } },
                });

                for (const stage of input.stages) {
                    const data = {
                        name: stage.name,
                        sortOrder: stage.sortOrder,
                        color: stage.color ?? null,
                        semantic: stage.semantic,
                        isTerminalSuccess: stage.isTerminalSuccess ?? false,
                        isTerminalFailure: stage.isTerminalFailure ?? false,
                    };
                    if (stage.id) {
                        await tx.stage.update({
                            where: { id: stage.id },
                            data,
                        });
                    } else {
                        await tx.stage.create({
                            data: { ...data, stageCategoryId: category.id },
                        });
                    }
                }
            }

            return tx.stageCategory.findUniqueOrThrow({
                where: { id: category.id },
                include: { stages: { orderBy: { sortOrder: "asc" } } },
            });
        });
    }

    /** Удалить не-системную и не-дефолтную воронку. */
    async deleteStageCategory(
        portalId: string,
        entityCode: string,
        categoryId: string
    ): Promise<void> {
        const category = await this.findCategoryInPortal(portalId, entityCode, categoryId);
        if (category.isSystem) {
            throw new BadRequestException("System funnel cannot be deleted");
        }
        if (category.isDefault) {
            throw new BadRequestException("Default funnel cannot be deleted");
        }
        await this.prisma.stageCategory.delete({ where: { id: categoryId } });
    }

    private async findCategoryInPortal(portalId: string, entityCode: string, categoryId: string) {
        const entityDef = await this.prisma.entityDefinition.findUnique({
            where: { portalId_code: { portalId, code: entityCode } },
            select: { id: true },
        });
        if (!entityDef) {
            throw new NotFoundException(`Entity "${entityCode}" not found`);
        }
        const category = await this.prisma.stageCategory.findFirst({
            where: { id: categoryId, portalId, entityDefinitionId: entityDef.id },
            select: { id: true, isSystem: true, isDefault: true },
        });
        if (!category) {
            throw new NotFoundException("Funnel not found");
        }
        return category;
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
