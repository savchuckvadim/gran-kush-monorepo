import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { Prisma, StageSemantic } from "@prisma/client";

import { type ContentLocale, resolveLabel } from "@common/i18n";
import { PrismaService } from "@common/prisma/prisma.service";

const STAGES_IN_ORDER = { stages: { orderBy: { sortOrder: "asc" } } } as const;

type StageCategoryRow = Prisma.StageCategoryGetPayload<{ include: typeof STAGES_IN_ORDER }>;
type StageRow = StageCategoryRow["stages"][number];

/** Стадия для ответа: название уже на языке запроса, сырые переводы наружу не уходят. */
export type StageView = Omit<StageRow, "nameI18n">;
export type StageCategoryView = Omit<StageCategoryRow, "stages"> & { stages: StageView[] };

export interface StageInput {
    name: string;
    sortOrder: number;
    color?: string | null;
    semantic: StageSemantic;
    isTerminalSuccess?: boolean;
    isTerminalFailure?: boolean;
}

const toStageView = (stage: StageRow, locale: ContentLocale): StageView => ({
    id: stage.id,
    stageCategoryId: stage.stageCategoryId,
    name: resolveLabel({ label: stage.name, labelI18n: stage.nameI18n }, locale),
    sortOrder: stage.sortOrder,
    color: stage.color,
    semantic: stage.semantic,
    isTerminalSuccess: stage.isTerminalSuccess,
    isTerminalFailure: stage.isTerminalFailure,
    createdAt: stage.createdAt,
    updatedAt: stage.updatedAt,
});

const toCategoryView = (row: StageCategoryRow, locale: ContentLocale): StageCategoryView => ({
    id: row.id,
    portalId: row.portalId,
    entityDefinitionId: row.entityDefinitionId,
    code: row.code,
    name: row.name,
    isDefault: row.isDefault,
    isSystem: row.isSystem,
    hiddenInUi: row.hiddenInUi,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    stages: row.stages.map((stage) => toStageView(stage, locale)),
});

/**
 * Редактор показывает название на языке запроса. Пришло то же слово (базовое или один из
 * переводов) — стадию не переименовывали, переводы остаются; иначе это слово клуба.
 */
const isRenamed = (stored: Pick<StageRow, "name" | "nameI18n">, name: string): boolean => {
    if (name === stored.name) return false;
    const translations =
        stored.nameI18n && typeof stored.nameI18n === "object" && !Array.isArray(stored.nameI18n)
            ? Object.values(stored.nameI18n)
            : [];
    return !translations.includes(name);
};

const stageData = (stage: StageInput) => ({
    sortOrder: stage.sortOrder,
    color: stage.color ?? null,
    semantic: stage.semantic,
    isTerminalSuccess: stage.isTerminalSuccess ?? false,
    isTerminalFailure: stage.isTerminalFailure ?? false,
});

/** Воронки (stage categories) любой сущности портала: конструктор в настройках и канбан. */
@Injectable()
export class OrderStagesService {
    constructor(private readonly prisma: PrismaService) {}

    /** Воронки сущности со стадиями по порядку; названия — на языке запроса. */
    async listStageCategories(
        portalId: string,
        entityCode: string,
        locale: ContentLocale
    ): Promise<StageCategoryView[]> {
        const entityDef = await this.prisma.entityDefinition.findUnique({
            where: { portalId_code: { portalId, code: entityCode } },
            select: { id: true },
        });
        if (!entityDef) {
            return [];
        }
        const rows = await this.prisma.stageCategory.findMany({
            where: { portalId, entityDefinitionId: entityDef.id },
            orderBy: [{ isDefault: "desc" }, { name: "asc" }],
            include: STAGES_IN_ORDER,
        });
        return rows.map((row) => toCategoryView(row, locale));
    }

    /** Обновить воронку: имя + upsert стадий (стадии без id создаются, отсутствующие удаляются). */
    async updateStageCategory(
        portalId: string,
        entityCode: string,
        categoryId: string,
        input: { name?: string; stages?: (StageInput & { id?: string })[] },
        locale: ContentLocale
    ): Promise<StageCategoryView> {
        const category = await this.findCategoryInPortal(portalId, entityCode, categoryId);

        const row = await this.prisma.$transaction(async (tx) => {
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

                const stored = new Map(
                    (
                        await tx.stage.findMany({
                            where: { stageCategoryId: category.id },
                            select: { id: true, name: true, nameI18n: true },
                        })
                    ).map((stage) => [stage.id, stage])
                );

                for (const stage of input.stages) {
                    if (!stage.id) {
                        await tx.stage.create({
                            data: {
                                ...stageData(stage),
                                name: stage.name,
                                stageCategoryId: category.id,
                            },
                        });
                        continue;
                    }

                    // только стадии этой воронки: id чужого клуба не должен ничего менять
                    const current = stored.get(stage.id);
                    if (!current) {
                        throw new NotFoundException(`Stage "${stage.id}" is not in this funnel`);
                    }
                    // Переименованная клубом стадия показывается его словом на всех языках
                    const renamed = isRenamed(current, stage.name);
                    await tx.stage.update({
                        where: { id: stage.id },
                        data: {
                            ...stageData(stage),
                            ...(renamed ? { name: stage.name, nameI18n: Prisma.DbNull } : {}),
                        },
                    });
                }
            }

            return tx.stageCategory.findUniqueOrThrow({
                where: { id: category.id },
                include: STAGES_IN_ORDER,
            });
        });

        return toCategoryView(row, locale);
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

    /** Создать воронку со стадиями для сущности (конструктор). */
    async createStageCategory(
        portalId: string,
        entityCode: string,
        input: { code: string; name: string; stages: StageInput[] },
        locale: ContentLocale
    ): Promise<StageCategoryView> {
        const entityDef = await this.prisma.entityDefinition.findUniqueOrThrow({
            where: { portalId_code: { portalId, code: entityCode } },
            select: { id: true },
        });
        const row = await this.prisma.stageCategory.create({
            data: {
                portalId,
                entityDefinitionId: entityDef.id,
                code: input.code,
                name: input.name,
                isDefault: false,
                isSystem: false,
                stages: {
                    create: input.stages.map((s) => ({ ...stageData(s), name: s.name })),
                },
            },
            include: STAGES_IN_ORDER,
        });
        return toCategoryView(row, locale);
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
}
