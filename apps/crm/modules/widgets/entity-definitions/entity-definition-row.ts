import type { EntityDefinitionSummary } from "@/modules/entities/entity-settings";

/** Строка списка сущностей: код ведёт на страницу её настроек. */
export interface EntityDefinitionRow {
    code: string;
    name: string;
    isSystem: boolean;
}

/** Системные сущности есть в каждом клубе, даже пока API не вернул ни одного определения. */
export const SYSTEM_ENTITY_CODES = ["member", "order"] as const;

export const toEntityDefinitionRows = (
    definitions: readonly EntityDefinitionSummary[]
): EntityDefinitionRow[] =>
    definitions.flatMap((definition) =>
        definition.code
            ? [
                  {
                      code: definition.code,
                      name: definition.name ?? "",
                      isSystem: definition.isSystem === true,
                  },
              ]
            : []
    );
