"use client";

import { useCallback, useMemo } from "react";

import { KanbanBoard, KanbanColumn, KanbanColumnHeader, KanbanItem } from "@workspace/ui";

import { type EntityRecord } from "@/modules/entities/entity-records";

import { RecordKanbanCard } from "./record-kanban-card";
import { type EntityStage } from "./stage-select";

/** Column of records whose stage was removed or never set. */
const NO_STAGE = "no-stage";
const NEUTRAL_COLOR = "#94a3b8";

interface RecordsKanbanProps {
    records: EntityRecord[];
    stages: EntityStage[];
    onEdit: (record: EntityRecord) => void;
    /** `""` — no stage */
    onStageChange: (record: EntityRecord, stageId: string) => void;
}

/** Records by stage on the shared kanban board; a card is moved by dragging it to a column. */
export function RecordsKanban({ records, stages, onEdit, onStageChange }: RecordsKanbanProps) {
    const recordsById = useMemo(
        () => new Map(records.map((record) => [record.id, record])),
        [records]
    );

    const columns = useMemo(
        () => [
            { id: NO_STAGE, name: "Без стадии", color: NEUTRAL_COLOR },
            ...stages.map((stage) => ({
                id: stage.id,
                name: stage.name,
                color: stage.color ?? NEUTRAL_COLOR,
            })),
        ],
        [stages]
    );

    const recordsByColumn = useMemo(() => {
        const grouped = new Map<string, EntityRecord[]>();
        for (const record of records) {
            const columnId = record.stage?.id ?? NO_STAGE;
            grouped.set(columnId, [...(grouped.get(columnId) ?? []), record]);
        }
        return grouped;
    }, [records]);

    const handleMove = useCallback(
        (recordId: string, columnId: string) => {
            const record = recordsById.get(recordId);
            if (record) onStageChange(record, columnId === NO_STAGE ? "" : columnId);
        },
        [onStageChange, recordsById]
    );

    const renderOverlay = useCallback(
        (recordId: string) => {
            const record = recordsById.get(recordId);
            return record ? <RecordKanbanCard record={record} /> : null;
        },
        [recordsById]
    );

    return (
        <KanbanBoard
            aria-label="Канбан записей"
            onMove={handleMove}
            renderOverlay={renderOverlay}
            className="h-[calc(100dvh-14rem)] min-h-[24rem]"
        >
            {columns.map((column) => {
                const columnRecords = recordsByColumn.get(column.id) ?? [];
                return (
                    <KanbanColumn
                        key={column.id}
                        id={column.id}
                        header={
                            <KanbanColumnHeader
                                title={column.name}
                                color={column.color}
                                count={columnRecords.length}
                            />
                        }
                    >
                        {columnRecords.map((record) => (
                            <KanbanItem key={record.id} id={record.id} columnId={column.id}>
                                <RecordKanbanCard record={record} onOpen={onEdit} />
                            </KanbanItem>
                        ))}
                    </KanbanColumn>
                );
            })}
        </KanbanBoard>
    );
}
