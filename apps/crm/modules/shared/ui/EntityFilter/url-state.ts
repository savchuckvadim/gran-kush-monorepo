import type {
    EntityFieldCondition,
    EntityFilterField,
    EntityFilterRange,
    EntityFilterState,
    EntityFilterValue,
} from "./types";

/** `?q=…&f.city=madrid,barcelona&f.birthday=1990-01-01..1995-12-31&page=2` */
const FIELD_PREFIX = "f.";
const RANGE_SEPARATOR = "..";

export const EMPTY_FILTER: EntityFilterState = { q: "", values: {} };

export const isRange = (value: EntityFilterValue): value is EntityFilterRange =>
    typeof value === "object" && !Array.isArray(value);

export function isEmptyValue(value: EntityFilterValue | undefined): boolean {
    if (value === undefined) return true;
    if (typeof value === "string") return value.trim() === "";
    if (Array.isArray(value)) return value.length === 0;
    if (isRange(value)) return !value.from && !value.to;
    return false;
}

const decodeValue = (field: EntityFilterField, raw: string): EntityFilterValue | undefined => {
    switch (field.type) {
        case "text":
            return raw.trim() ? raw : undefined;
        case "select":
            return field.options?.some((o) => o.value === raw) ? raw : undefined;
        case "multiselect": {
            const known = new Set(field.options?.map((o) => o.value));
            const values = raw.split(",").filter((v) => known.has(v));
            return values.length > 0 ? values : undefined;
        }
        case "boolean":
            return raw === "1" ? true : raw === "0" ? false : undefined;
        case "number":
        case "date": {
            const [from = "", to = ""] = raw.split(RANGE_SEPARATOR);
            return from || to ? { from: from || undefined, to: to || undefined } : undefined;
        }
    }
};

const encodeValue = (value: EntityFilterValue): string => {
    if (typeof value === "boolean") return value ? "1" : "0";
    if (Array.isArray(value)) return value.join(",");
    if (isRange(value)) return `${value.from ?? ""}${RANGE_SEPARATOR}${value.to ?? ""}`;
    return value;
};

export function decodeFilterState(
    params: URLSearchParams,
    fields: EntityFilterField[]
): EntityFilterState {
    const values: Record<string, EntityFilterValue> = {};
    for (const field of fields) {
        const raw = params.get(`${FIELD_PREFIX}${field.key}`);
        const value = raw === null ? undefined : decodeValue(field, raw);
        if (value !== undefined) values[field.key] = value;
    }
    return { q: params.get("q") ?? "", values };
}

/** Rewrites q, page and the field params of `base`, keeping everything else in the URL. */
export function encodeFilterState(
    state: EntityFilterState,
    page: number,
    base: URLSearchParams
): URLSearchParams {
    const params = new URLSearchParams(base);
    for (const key of [...params.keys()]) {
        if (key === "q" || key === "page" || key.startsWith(FIELD_PREFIX)) params.delete(key);
    }
    if (state.q.trim()) params.set("q", state.q);
    for (const [key, value] of Object.entries(state.values)) {
        if (!isEmptyValue(value)) params.set(`${FIELD_PREFIX}${key}`, encodeValue(value));
    }
    if (page > 1) params.set("page", String(page));
    return params;
}

export const activeFieldKeys = (state: EntityFilterState, fields: EntityFilterField[]): string[] =>
    fields.filter((field) => !isEmptyValue(state.values[field.key])).map((field) => field.key);

/**
 * The list API's `filter` conditions. `exclude` keeps out the keys a page maps itself
 * (a status is a column of the record, not a field).
 */
export function toFieldConditions(
    state: EntityFilterState,
    fields: EntityFilterField[],
    exclude: string[] = []
): EntityFieldCondition[] {
    const conditions: EntityFieldCondition[] = [];
    for (const field of fields) {
        const value = state.values[field.key];
        if (exclude.includes(field.key) || value === undefined || isEmptyValue(value)) continue;

        if (typeof value === "boolean") {
            conditions.push({ field: field.key, op: "eq", value });
        } else if (Array.isArray(value)) {
            conditions.push({ field: field.key, op: "in", value });
        } else if (isRange(value)) {
            const bound = (raw: string, isEnd: boolean): string | number | undefined => {
                if (field.type === "number") {
                    const n = Number(raw);
                    return Number.isFinite(n) ? n : undefined;
                }
                // the end of the day, so a date-time value of that day is still inside
                return isEnd ? `${raw}T23:59:59.999Z` : raw;
            };
            const from = value.from ? bound(value.from, false) : undefined;
            const to = value.to ? bound(value.to, true) : undefined;
            if (from !== undefined) conditions.push({ field: field.key, op: "gte", value: from });
            if (to !== undefined) conditions.push({ field: field.key, op: "lte", value: to });
        } else if (field.type === "select") {
            conditions.push({ field: field.key, op: "in", value: [value] });
        } else {
            conditions.push({ field: field.key, op: "contains", value: value.trim() });
        }
    }
    return conditions;
}
