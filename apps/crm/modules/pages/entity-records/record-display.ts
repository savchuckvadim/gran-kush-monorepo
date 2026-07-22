import { type EntityRecord } from "@/modules/entities/entity-records";

export function renderValue(value: unknown): string {
    if (value == null) return "—";
    if (Array.isArray(value)) return value.map((item) => String(item)).join(", ");
    if (typeof value === "object") return JSON.stringify(value);
    if (typeof value === "boolean") return value ? "да" : "нет";
    return String(value);
}

export function recordTitle(record: EntityRecord): string {
    const preferred = record.fields.find((field) =>
        ["title", "name", "first_name"].includes(field.fieldKey)
    );
    const value = preferred?.value as unknown;
    if (value != null && value !== "") return renderValue(value);
    return record.id.slice(0, 8);
}
