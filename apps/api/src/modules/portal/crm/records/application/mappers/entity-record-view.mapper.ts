import { ContentLocale, resolveLabel } from "@common/i18n";
import type { EntityRecordWithRelations } from "@modules/portal/crm/records/infrastructure/prisma-includes/entity-record.include";

export interface EntityRecordView {
    id: string;
    entityCode: string;
    isActive: boolean;
    stage: { id: string; name: string; color: string | null; semantic: string } | null;
    statusItem: { id: string; key: string; label: string; color: string | null } | null;
    fields: { fieldKey: string; type: string; label: string | null; value: unknown }[];
    relations: { fieldKey: string; targetRecordIds: string[] }[];
    createdAt: string;
    updatedAt: string;
}

/** Запись для API: значения полей по порядку схемы, подписи — на языке запроса. */
export const toEntityRecordView = (
    entityCode: string,
    row: EntityRecordWithRelations,
    locale: ContentLocale
): EntityRecordView => {
    const byDef = new Map<
        string,
        { def: (typeof row.fieldValues)[0]["fieldDefinition"]; values: unknown[] }
    >();
    for (const fv of row.fieldValues) {
        let bucket = byDef.get(fv.fieldDefinitionId);
        if (!bucket) {
            bucket = { def: fv.fieldDefinition, values: [] };
            byDef.set(fv.fieldDefinitionId, bucket);
        }
        bucket.values.push(fv.valueJson);
    }

    const fields = [...byDef.values()]
        .sort((a, b) => a.def.sortOrder - b.def.sortOrder)
        .map(({ def, values }) => ({
            fieldKey: def.fieldKey,
            type: def.type,
            label: resolveLabel(def, locale),
            value: def.isMultiple ? values : (values[0] ?? null),
        }));

    const relationsByKey = new Map<string, string[]>();
    for (const rel of row.relationsAsSource) {
        const key = rel.fieldDefinition.fieldKey;
        const bucket = relationsByKey.get(key) ?? [];
        bucket.push(rel.targetRecordId);
        relationsByKey.set(key, bucket);
    }

    return {
        id: row.id,
        entityCode,
        isActive: row.isActive,
        stage: row.stage,
        statusItem: row.statusItem && {
            id: row.statusItem.id,
            key: row.statusItem.key,
            label: resolveLabel(row.statusItem, locale),
            color: row.statusItem.color,
        },
        fields,
        relations: [...relationsByKey.entries()].map(([fieldKey, targetRecordIds]) => ({
            fieldKey,
            targetRecordIds,
        })),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
};
