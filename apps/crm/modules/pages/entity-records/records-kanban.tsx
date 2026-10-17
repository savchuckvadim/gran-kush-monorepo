"use client";

import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { kanbanAfterId, KanbanBoard, type KanbanPlacement, kanbanStaysPut } from "@workspace/ui";

import {
    columnRecordIds,
    type EntityRecord,
    findRecordInColumns,
    type RecordsFilter,
    type RecordStage,
    useMoveEntityRecord,
} from "@/modules/entities/entity-records";

import { RecordKanbanCard } from "./record-kanban-card";
import { RecordsKanbanColumn } from "./records-kanban-column";
import type { EntityStage } from "./stage-select";

interface RecordsKanbanProps {
    code: string;
    /** The stages of the chosen funnel: one column each */
    stages: readonly EntityStage[];
    filter: RecordsFilter;
    /** Manager and up; others see the board without drag and drop */
    canMove: boolean;
    onOpen: (record: EntityRecord) => void;
}

const toRecordStage = (stage: EntityStage): RecordStage => ({
    id: stage.id,
    stageCategoryId: stage.stageCategoryId,
    name: stage.name,
    color: stage.color ?? null,
    semantic: stage.semantic,
});

/**
 * Records of one funnel by stage on the shared kanban board. A card is dragged to another column
 * or to a slot between cards; the new place is saved, so the order stays as the user left it.
 */
export function RecordsKanban({ code, stages, filter, canMove, onOpen }: RecordsKanbanProps) {
    const t = useTranslations("crm.records");
    const queryClient = useQueryClient();
    const { mutate } = useMoveEntityRecord(code);
    const stagesById = useMemo(() => new Map(stages.map((stage) => [stage.id, stage])), [stages]);

    const handleMove = useCallback(
        (recordId: string, targetId: string, placement: KanbanPlacement | null) => {
            const record = findRecordInColumns(queryClient, code, recordId);
            const target = stagesById.get(targetId);
            if (!record || !target) return;
            const ids = columnRecordIds(queryClient, code, target.id, filter);
            const afterId = kanbanAfterId(ids, record.id, placement);
            if (record.stage?.id === target.id && kanbanStaysPut(ids, record.id, afterId)) return;
            mutate(
                { record, target: toRecordStage(target), afterId },
                { onError: () => toast.error(t("moveError")) }
            );
        },
        [code, filter, mutate, queryClient, stagesById, t]
    );

    const renderOverlay = useCallback(
        (recordId: string) => {
            const record = findRecordInColumns(queryClient, code, recordId);
            return record ? <RecordKanbanCard record={record} /> : null;
        },
        [code, queryClient]
    );

    if (stages.length === 0) {
        return (
            <p className="py-10 text-center text-sm text-muted-foreground">
                {t("kanban.noFunnel")}
            </p>
        );
    }

    return (
        <KanbanBoard
            aria-label={t("kanban.label")}
            onMove={handleMove}
            renderOverlay={renderOverlay}
            className="h-[calc(100dvh-16rem)] min-h-[26rem]"
        >
            {stages.map((stage) => (
                <RecordsKanbanColumn
                    key={stage.id}
                    code={code}
                    stage={stage}
                    filter={filter}
                    canMove={canMove}
                    onOpen={onOpen}
                />
            ))}
        </KanbanBoard>
    );
}
