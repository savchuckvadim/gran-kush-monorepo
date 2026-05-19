import type { Prisma } from "@prisma/client";

import { MEMBER_FIELD_KEYS } from "@modules/portal/crm/entity-fields/constants/member-field-keys";

export type FieldRow = {
    valueJson: Prisma.JsonValue;
    fieldDefinition: { fieldKey: string };
};

/** Достаёт скаляр из JSONB (поддержка сырой строки/числа из PostgreSQL to_jsonb). */
export function jsonValueToScalar(json: Prisma.JsonValue): unknown {
    if (json === null || json === undefined) {
        return null;
    }
    if (typeof json === "string" || typeof json === "number" || typeof json === "boolean") {
        return json;
    }
    if (Array.isArray(json)) {
        return json;
    }
    if (typeof json === "object" && json !== null && "value" in json) {
        return (json as { value: unknown }).value;
    }
    return json;
}

export function buildMemberFieldMap(rows: FieldRow[]): Record<string, unknown> {
    const map: Record<string, unknown> = {};
    for (const row of rows) {
        const key = row.fieldDefinition.fieldKey;
        map[key] = jsonValueToScalar(row.valueJson);
    }
    return map;
}

/** Безопасная строка для отображения скаляра поля (без String(object) → [object Object]). */
export function scalarFieldToDisplayString(value: unknown): string {
    if (value === null || value === undefined) {
        return "";
    }
    if (typeof value === "string") {
        return value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }
    return "";
}

/** ISO date string (YYYY-MM-DD) или исходная строка; объекты не приводим к String. */
export function fieldValueToOptionalDateString(value: unknown): string | null {
    if (value === null || value === undefined) {
        return null;
    }
    if (typeof value === "string") {
        return value;
    }
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }
    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    return null;
}

export function getMemberDisplayNameParts(fieldMap: Record<string, unknown>): {
    firstName: string;
    lastName: string | null;
} {
    const first = fieldMap[MEMBER_FIELD_KEYS.FIRST_NAME];
    const last = fieldMap[MEMBER_FIELD_KEYS.LAST_NAME];
    return {
        firstName: typeof first === "string" ? first : scalarFieldToDisplayString(first),
        lastName:
            typeof last === "string"
                ? last
                : last === null || last === undefined
                  ? null
                  : scalarFieldToDisplayString(last) || null,
    };
}
