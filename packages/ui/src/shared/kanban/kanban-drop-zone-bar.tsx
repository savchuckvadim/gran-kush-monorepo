"use client";

import { useDndContext } from "@dnd-kit/core";

import type { KanbanDropZoneSpec } from "./kanban.types";
import { KanbanDropZone } from "./kanban-drop-zone";

/** Drop zones at the bottom of the screen, shown only while a card is being dragged. */
export function KanbanDropZoneBar({ zones }: { zones: readonly KanbanDropZoneSpec[] }) {
    const { active } = useDndContext();
    if (!active || zones.length === 0) return null;

    return (
        <div
            data-slot="kanban-drop-zones"
            className="fixed inset-x-0 bottom-0 z-50 flex gap-3 border-t bg-background/90 p-3 backdrop-blur-md md:inset-x-auto md:right-6 md:bottom-6 md:w-[min(40rem,calc(100vw-3rem))] md:rounded-2xl md:border md:shadow-2xl"
        >
            {zones.map((zone) => (
                <KanbanDropZone key={zone.id} {...zone} />
            ))}
        </div>
    );
}
