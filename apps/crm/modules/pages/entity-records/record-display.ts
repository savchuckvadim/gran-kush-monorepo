import type { EntityRecord } from "@/modules/entities/entity-records";

/** The first of these fields is the record's name on a card, a row and in the dialog. */
const TITLE_KEYS = ["title", "name", "first_name"];

export interface ValueLabels {
    yes: string;
    no: string;
}

export interface RecordFact {
    key: string;
    label: string;
    text: string;
}

type RecordField = EntityRecord["fields"][number];

// the generated type of a dynamic value is `Record<string, never>`: widened once, here
const valueOf = (field: RecordField): unknown => field.value;

/** A field value as a line of text. */
export function renderValue(value: unknown, labels: ValueLabels): string {
    if (value === null || value === undefined || value === "") return "—";
    if (Array.isArray(value)) return value.map((item) => renderValue(item, labels)).join(", ");
    if (typeof value === "boolean") return value ? labels.yes : labels.no;
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
}

export function recordTitle(record: EntityRecord): string {
    const named = record.fields.find((field) => TITLE_KEYS.includes(field.fieldKey));
    const value = named ? valueOf(named) : undefined;
    return value === null || value === undefined || value === ""
        ? record.id.slice(0, 8)
        : String(value);
}

/** The first filled fields after the title: what a row and a card say about the record. */
export function recordFacts(record: EntityRecord, labels: ValueLabels, limit = 4): RecordFact[] {
    return record.fields
        .filter((field) => {
            const value = valueOf(field);
            return !TITLE_KEYS.includes(field.fieldKey) && value !== null && value !== "";
        })
        .slice(0, limit)
        .map((field) => ({
            key: field.fieldKey,
            label: field.label ?? field.fieldKey,
            text: renderValue(valueOf(field), labels),
        }));
}
