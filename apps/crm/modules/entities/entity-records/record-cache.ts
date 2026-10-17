import type { InfiniteData, QueryClient } from "@tanstack/react-query";

import type { SchemaEntityRecordListResponseDto } from "@workspace/api-client/core";

import type { EntityRecord, RecordsFilter } from "./api";
import { RECORD_COLUMN_STAGE_INDEX, recordKeys } from "./record-keys";

export type RecordPage = SchemaEntityRecordListResponseDto;
/** The cached pages of one kanban column; the page param is `skip`. */
export type RecordColumnData = InfiniteData<RecordPage, number>;
export type RecordStage = NonNullable<EntityRecord["stage"]>;

const columnQueries = (queryClient: QueryClient, code: string) =>
    queryClient.getQueriesData<RecordColumnData>({ queryKey: recordKeys.columns(code) });

/** A record as a loaded kanban column shows it — for the drag overlay and the move itself. */
export function findRecordInColumns(
    queryClient: QueryClient,
    code: string,
    recordId: string
): EntityRecord | undefined {
    for (const [, data] of columnQueries(queryClient, code)) {
        for (const page of data?.pages ?? []) {
            const record = page.items.find((item) => item.id === recordId);
            if (record) return record;
        }
    }
    return undefined;
}

/** The ids of a loaded column in its order — to name the card a dropped one goes under. */
export function columnRecordIds(
    queryClient: QueryClient,
    code: string,
    stageId: string,
    filter: RecordsFilter
): string[] {
    const data = queryClient.getQueryData<RecordColumnData>(
        recordKeys.column(code, stageId, filter)
    );
    return data?.pages.flatMap((page) => page.items.map((item) => item.id)) ?? [];
}

const withoutRecord = (data: RecordColumnData, recordId: string): RecordColumnData => ({
    ...data,
    pages: data.pages.map((page) => {
        const items = page.items.filter((item) => item.id !== recordId);
        return items.length === page.items.length
            ? page
            : { ...page, items, total: Math.max(0, page.total - 1) };
    }),
});

/** Puts the record right under `afterId`; not loaded or `null` — on top of the column. */
const withRecordAfter = (
    data: RecordColumnData,
    record: EntityRecord,
    afterId: string | null
): RecordColumnData => {
    const pageIndex = afterId
        ? data.pages.findIndex((page) => page.items.some((item) => item.id === afterId))
        : -1;
    const at = pageIndex >= 0 ? pageIndex : 0;
    return {
        ...data,
        pages: data.pages.map((page, index) => {
            if (index !== at) return page;
            const slot =
                pageIndex >= 0 ? page.items.findIndex((item) => item.id === afterId) + 1 : 0;
            const items = [...page.items.slice(0, slot), record, ...page.items.slice(slot)];
            return { ...page, items, total: page.total + 1 };
        }),
    };
};

/**
 * Shows a move before the server confirms it: the card leaves every column and lands in the
 * target column under `afterId` (on top without it); the table rows and the open record show the
 * new stage at once.
 */
export function applyOptimisticRecordMove(
    queryClient: QueryClient,
    code: string,
    record: EntityRecord,
    target: RecordStage,
    afterId: string | null
): void {
    const moved: EntityRecord = { ...record, stage: target };

    for (const [key, data] of columnQueries(queryClient, code)) {
        if (!data) continue;
        const next = withoutRecord(data, record.id);
        const isTarget = key[RECORD_COLUMN_STAGE_INDEX] === target.id;
        queryClient.setQueryData<RecordColumnData>(
            key,
            isTarget ? withRecordAfter(next, moved, afterId) : next
        );
    }

    queryClient.setQueriesData<RecordPage>({ queryKey: recordKeys.lists(code) }, (page) =>
        page
            ? {
                  ...page,
                  items: page.items.map((item) => (item.id === record.id ? moved : item)),
              }
            : page
    );
    queryClient.setQueryData<EntityRecord>(recordKeys.detail(code, record.id), (detail) =>
        detail ? { ...detail, stage: target } : detail
    );
}
