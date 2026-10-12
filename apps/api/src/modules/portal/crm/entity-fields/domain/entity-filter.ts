/** Условия фильтра списка по полям сущности (EAV); значение сверяется с типом поля при сборке запроса. */
export const FIELD_FILTER_OPS = ["contains", "eq", "in", "gte", "lte"] as const;

export type FieldFilterOp = (typeof FIELD_FILTER_OPS)[number];

export type FieldFilterValue = string | number | boolean | string[];

export interface FieldCondition {
    field: string;
    op: FieldFilterOp;
    value: FieldFilterValue;
}

export interface EntityListFilter {
    /** Каждое слово должно найтись хотя бы в одном текстовом поле. */
    q?: string;
    conditions?: FieldCondition[];
}
