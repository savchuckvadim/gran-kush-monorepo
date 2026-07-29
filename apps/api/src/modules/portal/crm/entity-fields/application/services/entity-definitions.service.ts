import { ConflictException, Injectable } from "@nestjs/common";

import { FormPurpose, PortalFieldType, Prisma, StageSemantic } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";

export const ENTITY_TITLE_FIELD_KEY = "title";

export type EntityDefinitionSummary = {
    id: string;
    code: string;
    name: string;
    isSystem: boolean;
    isActive: boolean;
    createdAt: Date;
};

const DEFAULT_STAGES = [
    { name: "New", sortOrder: 0, color: "#3b82f6", semantic: StageSemantic.NEW },
    { name: "In progress", sortOrder: 1, color: "#f59e0b", semantic: StageSemantic.IN_PROGRESS },
    {
        name: "Done",
        sortOrder: 2,
        color: "#22c55e",
        semantic: StageSemantic.SUCCESS,
        isTerminalSuccess: true,
    },
    {
        name: "Cancelled",
        sortOrder: 3,
        color: "#ef4444",
        semantic: StageSemantic.FAILURE,
        isTerminalFailure: true,
    },
] as const;

@Injectable()
export class EntityDefinitionsService {
    constructor(private readonly prisma: PrismaService) {}

    async list(portalId: string): Promise<EntityDefinitionSummary[]> {
        return this.prisma.entityDefinition.findMany({
            where: { portalId },
            orderBy: { code: "asc" },
            select: {
                id: true,
                code: true,
                name: true,
                isSystem: true,
                isActive: true,
                createdAt: true,
            },
        });
    }

    /**
     * Создаёт кастомную сущность сразу рабочей: поле title, формы
     * crm_create/crm_detail и дефолтная воронка — иначе записи не создать из UI.
     */
    async create(
        portalId: string,
        input: { code: string; name: string }
    ): Promise<EntityDefinitionSummary> {
        const code = input.code.trim();
        const name = input.name.trim();

        try {
            return await this.prisma.$transaction(async (tx) => {
                const definition = await tx.entityDefinition.create({
                    data: { portalId, code, name, isSystem: false, isActive: true },
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        isSystem: true,
                        isActive: true,
                        createdAt: true,
                    },
                });

                const titleField = await tx.fieldDefinition.create({
                    data: {
                        entityDefinitionId: definition.id,
                        fieldKey: ENTITY_TITLE_FIELD_KEY,
                        type: PortalFieldType.string,
                        label: "Title",
                        labelI18n: { ru: "Название", en: "Title", es: "Título" },
                        isActive: true,
                        isSystem: true,
                        deletableByPortal: false,
                        customizableByPortal: true,
                        sortOrder: 0,
                        showInFilters: true,
                    },
                    select: { id: true },
                });

                for (const purpose of [FormPurpose.crm_create, FormPurpose.crm_detail]) {
                    await tx.formDefinition.create({
                        data: {
                            portalId,
                            entityDefinitionId: definition.id,
                            purpose,
                            items: {
                                create: [
                                    {
                                        fieldDefinitionId: titleField.id,
                                        sortOrder: 0,
                                        required: purpose === FormPurpose.crm_create,
                                        visible: true,
                                        readOnly: false,
                                    },
                                ],
                            },
                        },
                    });
                }

                await tx.stageCategory.create({
                    data: {
                        portalId,
                        entityDefinitionId: definition.id,
                        code: "default",
                        name: "Default",
                        isDefault: true,
                        isSystem: false,
                        stages: {
                            create: DEFAULT_STAGES.map((s) => ({
                                name: s.name,
                                sortOrder: s.sortOrder,
                                color: s.color,
                                semantic: s.semantic,
                                isTerminalSuccess:
                                    "isTerminalSuccess" in s ? s.isTerminalSuccess : false,
                                isTerminalFailure:
                                    "isTerminalFailure" in s ? s.isTerminalFailure : false,
                            })),
                        },
                    },
                });

                return definition;
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                throw new ConflictException(`Entity "${code}" already exists in this portal`);
            }
            throw error;
        }
    }
}
