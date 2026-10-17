"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { listEntityRecords, type RecordsFilter } from "./api";
import { recordKeys } from "./record-keys";

const COLUMN_PAGE_SIZE = 20;

/** The records of one kanban column in the order of its cards, 20 at a time as it scrolls. */
export function useEntityRecordColumn(code: string, stageId: string, filter: RecordsFilter) {
    return useInfiniteQuery({
        queryKey: recordKeys.column(code, stageId, filter),
        queryFn: ({ pageParam }) =>
            listEntityRecords(code, {
                ...filter,
                stageId,
                sortBy: "stagePosition",
                limit: COLUMN_PAGE_SIZE,
                skip: pageParam,
            }),
        initialPageParam: 0,
        getNextPageParam: (last, pages) => {
            const loaded = pages.reduce((sum, page) => sum + page.items.length, 0);
            return loaded < last.total ? loaded : undefined;
        },
    });
}
