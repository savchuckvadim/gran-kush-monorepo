import { Prisma } from "@prisma/client";

import { GLOBAL_ENTITY_TEMPLATE_SEEDS } from "./global-templates.seed";

type Db = Prisma.TransactionClient;

export interface SystemLabelSyncResult {
    templateFields: number;
    templateStatusItems: number;
    templateStages: number;
    fieldDefinitions: number;
    statusItems: number;
    stages: number;
}

/**
 * Дописывает переводы подписей из {@link GLOBAL_ENTITY_TEMPLATE_SEEDS} в уже созданные
 * шаблоны и в системные поля, статусы и стадии клубов, заведённых до появления переводов.
 *
 * Трогает только строки без перевода (`label_i18n` / `name_i18n IS NULL`) и с нетронутой базовой
 * подписью шаблона: если клуб переименовал статус или стадию, его слово остаётся на всех языках.
 * Поэтому безопасно гонять на каждом старте.
 */
export async function syncSystemLabelTranslations(db: Db): Promise<SystemLabelSyncResult> {
    const result: SystemLabelSyncResult = {
        templateFields: 0,
        templateStatusItems: 0,
        templateStages: 0,
        fieldDefinitions: 0,
        statusItems: 0,
        stages: 0,
    };
    const missing = { equals: Prisma.AnyNull };

    for (const seed of GLOBAL_ENTITY_TEMPLATE_SEEDS) {
        for (const field of seed.fields) {
            const untranslated = {
                fieldKey: field.fieldKey,
                label: field.labelI18n.en,
                labelI18n: missing,
            };
            const data = { labelI18n: field.labelI18n };
            const templates = await db.globalFieldTemplate.updateMany({
                where: { ...untranslated, globalEntityTemplate: { code: seed.code } },
                data,
            });
            const definitions = await db.fieldDefinition.updateMany({
                where: { ...untranslated, isSystem: true, entityDefinition: { code: seed.code } },
                data,
            });
            result.templateFields += templates.count;
            result.fieldDefinitions += definitions.count;
        }

        for (const set of seed.statusSets) {
            for (const item of set.items) {
                const untranslated = {
                    key: item.key,
                    label: item.labelI18n.en,
                    labelI18n: missing,
                };
                const data = { labelI18n: item.labelI18n };
                const templates = await db.globalStatusItemTemplate.updateMany({
                    where: {
                        ...untranslated,
                        globalStatusSetTemplate: {
                            code: set.code,
                            globalEntityTemplate: { code: seed.code },
                        },
                    },
                    data,
                });
                const items = await db.statusItem.updateMany({
                    where: {
                        ...untranslated,
                        isSystem: true,
                        statusSet: { code: set.code, entityDefinition: { code: seed.code } },
                    },
                    data,
                });
                result.templateStatusItems += templates.count;
                result.statusItems += items.count;
            }
        }

        for (const category of seed.stageCategories) {
            for (const stage of category.stages) {
                const untranslated = { name: stage.nameI18n.en, nameI18n: missing };
                const data = { nameI18n: stage.nameI18n };
                const templates = await db.globalStageTemplate.updateMany({
                    where: {
                        ...untranslated,
                        globalStageCategoryTemplate: {
                            code: category.code,
                            globalEntityTemplate: { code: seed.code },
                        },
                    },
                    data,
                });
                const stages = await db.stage.updateMany({
                    where: {
                        ...untranslated,
                        stageCategory: {
                            code: category.code,
                            entityDefinition: { code: seed.code },
                        },
                    },
                    data,
                });
                result.templateStages += templates.count;
                result.stages += stages.count;
            }
        }
    }

    return result;
}
