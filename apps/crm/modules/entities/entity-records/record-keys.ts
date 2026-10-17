import type { EntityRecordListParams, RecordsFilter } from "./api";

/**
 * Query keys of one smart process. Everything a record change touches lives under `all`, so one
 * invalidation refreshes the table, the kanban columns and the open record.
 */
export const recordKeys = {
    all: (code: string) => ["entity-records", code] as const,
    list: (code: string, params?: EntityRecordListParams) =>
        [...recordKeys.all(code), "list", params ?? {}] as const,
    lists: (code: string) => [...recordKeys.all(code), "list"] as const,
    columns: (code: string) => [...recordKeys.all(code), "column"] as const,
    column: (code: string, stageId: string, filter: RecordsFilter) =>
        [...recordKeys.columns(code), stageId, filter] as const,
    detail: (code: string, id: string) => [...recordKeys.all(code), "detail", id] as const,
};

/** Index of the stage id in a {@link recordKeys.column} key. */
export const RECORD_COLUMN_STAGE_INDEX = 3;
