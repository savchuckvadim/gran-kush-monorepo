import type { EntityFilterField, EntityFilterFieldType } from "@/modules/shared/ui/EntityFilter";

import type { EntityFormSchemaField } from "./api";

/** Portal field types the list filter can handle; a relation picks records, not options — later. */
const FILTER_TYPE: Partial<Record<string, EntityFilterFieldType>> = {
    string: "text",
    text: "text",
    email: "text",
    phone: "text",
    url: "text",
    single_select: "select",
    multi_select: "multiselect",
    boolean: "boolean",
    int: "number",
    decimal: "number",
    date: "date",
    datetime: "date",
};

/** `GET …/filter-fields` → the fields of `EntityFilter`; `showInFilters` ones stand in it at once. */
export const toFilterFields = (schemaFields: EntityFormSchemaField[]): EntityFilterField[] =>
    schemaFields.flatMap((field) => {
        const type = FILTER_TYPE[field.type];
        if (!type) return [];
        return [
            {
                key: field.fieldKey,
                label: field.label ?? field.fieldKey,
                type,
                isDefault: field.showInFilters ?? false,
                options: field.options.map((option) => ({
                    value: option.valueKey,
                    label: option.label,
                    color: option.color,
                })),
            },
        ];
    });
