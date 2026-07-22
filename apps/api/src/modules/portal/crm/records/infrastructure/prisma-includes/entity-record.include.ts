import { Prisma } from "@prisma/client";

/**
 * Стандартный include для записи универсальной сущности (smart-process):
 * стадия, статус-элемент, значения полей (со схемой) и связи-источники.
 */
export const ENTITY_RECORD_INCLUDE = {
    stage: { select: { id: true, name: true, color: true, semantic: true } },
    statusItem: { select: { id: true, key: true, label: true, color: true } },
    fieldValues: {
        orderBy: [{ fieldDefinitionId: "asc" as const }, { valueIndex: "asc" as const }],
        include: {
            fieldDefinition: {
                select: {
                    id: true,
                    fieldKey: true,
                    type: true,
                    label: true,
                    labelOverride: true,
                    isMultiple: true,
                    sortOrder: true,
                },
            },
        },
    },
    relationsAsSource: {
        orderBy: { sortOrder: "asc" as const },
        include: { fieldDefinition: { select: { fieldKey: true } } },
    },
} satisfies Prisma.EntityRecordInclude;

/** Запись сущности со всеми связями по {@link ENTITY_RECORD_INCLUDE}. */
export type EntityRecordWithRelations = Prisma.EntityRecordGetPayload<{
    include: typeof ENTITY_RECORD_INCLUDE;
}>;
