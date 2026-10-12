export type EntityFilterFieldType =
    | "text"
    | "select"
    | "multiselect"
    | "boolean"
    | "number"
    | "date";

export interface EntityFilterOption {
    value: string;
    label: string;
    color?: string | null;
}

export interface EntityFilterField {
    key: string;
    label: string;
    type: EntityFilterFieldType;
    options?: EntityFilterOption[];
    /** Shown in the panel until the viewer picks the fields themselves. */
    isDefault?: boolean;
}

export interface EntityFilterRange {
    from?: string;
    to?: string;
}

export type EntityFilterValue = string | string[] | boolean | EntityFilterRange;

export interface EntityFilterState {
    q: string;
    values: Record<string, EntityFilterValue>;
}

/** A condition of the list API (`filter` query param, JSON). */
export interface EntityFieldCondition {
    field: string;
    op: "contains" | "eq" | "in" | "gte" | "lte";
    value: string | number | boolean | string[];
}
