"use client";

import { useMemo } from "react";

import type { KanbanDropZoneSpec } from "@workspace/ui";

import { type FunnelStages, stageColor } from "@/modules/entities/order";

/** Completed and cancelled stages as drop zones at the bottom of the screen. */
export function useClosingDropZones({
    success,
    failure,
}: Pick<FunnelStages, "success" | "failure">): KanbanDropZoneSpec[] {
    return useMemo(
        () => [
            ...success.map((stage) => ({
                id: stage.id,
                label: stage.name,
                tone: "success" as const,
                color: stageColor(stage),
            })),
            ...failure.map((stage) => ({
                id: stage.id,
                label: stage.name,
                tone: "danger" as const,
                color: stageColor(stage),
            })),
        ],
        [success, failure]
    );
}
