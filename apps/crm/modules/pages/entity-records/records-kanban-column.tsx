"use client";

import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";

import { KanbanColumn, KanbanColumnHeader, KanbanItem } from "@workspace/ui";

import {
    type EntityRecord,
    type RecordsFilter,
    useEntityRecordColumn,
} from "@/modules/entities/entity-records";
import { stageColor } from "@/modules/shared/lib/stage-color";
import { KanbanColumnFooter } from "@/modules/shared/ui/KanbanColumnFooter";

import { RecordKanbanCard } from "./record-kanban-card";
import type { EntityStage } from "./stage-select";

interface RecordsKanbanColumnProps {
    code: string;
    stage: EntityStage;
    filter: RecordsFilter;
    canMove: boolean;
    onOpen: (record: EntityRecord) => void;
}

/** One stage: the count in the header, the cards loaded as the column scrolls. */
export function RecordsKanbanColumn({
    code,
    stage,
    filter,
    canMove,
    onOpen,
}: RecordsKanbanColumnProps) {
    const t = useTranslations("crm.records.kanban");
    const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
        useEntityRecordColumn(code, stage.id, filter);
    const records = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
    const loadMore = useCallback(() => void fetchNextPage(), [fetchNextPage]);

    return (
        <KanbanColumn
            id={stage.id}
            header={
                <KanbanColumnHeader
                    title={stage.name}
                    color={stageColor(stage)}
                    count={data?.pages[0]?.total}
                />
            }
            footer={
                <KanbanColumnFooter
                    isLoading={isLoading}
                    isError={isError}
                    isEmpty={records.length === 0}
                    hasNextPage={hasNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                    onLoadMore={loadMore}
                    labels={{
                        empty: t("empty"),
                        loadError: t("loadError"),
                        loadMore: t("loadMore"),
                    }}
                />
            }
        >
            {records.map((record) => (
                <KanbanItem key={record.id} id={record.id} columnId={stage.id} disabled={!canMove}>
                    <RecordKanbanCard record={record} onOpen={onOpen} />
                </KanbanItem>
            ))}
        </KanbanColumn>
    );
}
