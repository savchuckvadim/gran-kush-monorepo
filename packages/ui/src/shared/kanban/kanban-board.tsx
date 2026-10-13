"use client";

import { type ReactNode, useState } from "react";

import {
    DndContext,
    type DragEndEvent,
    DragOverlay,
    type DragStartEvent,
    MeasuringStrategy,
} from "@dnd-kit/core";

import { cn } from "@workspace/ui/lib/utils";

import type { KanbanDropZoneSpec } from "./kanban.types";
import { KanbanDropZoneBar } from "./kanban-drop-zone-bar";
import { useKanbanSensors } from "./use-kanban-sensors";

export interface KanbanBoardProps {
    /** {@link KanbanColumn}s */
    children: ReactNode;
    /** A card was dropped on another column or on a drop zone */
    onMove: (itemId: string, targetId: string) => void;
    /** What follows the pointer while dragging */
    renderOverlay?: (itemId: string) => ReactNode;
    /** Targets shown at the bottom of the screen only while dragging (closing stages) */
    dropZones?: readonly KanbanDropZoneSpec[];
    className?: string;
    "aria-label"?: string;
}

// drop zones mount when a drag starts: they must be measured then, not only at its start
const MEASURING = { droppable: { strategy: MeasuringStrategy.Always } };

const columnOf = (data: Record<string, unknown> | undefined): string | undefined => {
    const columnId = data?.columnId;
    return typeof columnId === "string" ? columnId : undefined;
};

/** A horizontal board of columns with drag and drop between them. Knows nothing of the items. */
export function KanbanBoard({
    children,
    onMove,
    renderOverlay,
    dropZones = [],
    className,
    "aria-label": ariaLabel,
}: KanbanBoardProps) {
    const sensors = useKanbanSensors();
    const [activeId, setActiveId] = useState<string | null>(null);

    const handleDragStart = ({ active }: DragStartEvent) => setActiveId(String(active.id));

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        setActiveId(null);
        if (!over) return;
        const targetId = String(over.id);
        if (targetId === columnOf(active.data.current)) return;
        onMove(String(active.id), targetId);
    };

    return (
        <DndContext
            sensors={sensors}
            measuring={MEASURING}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveId(null)}
        >
            <div
                data-slot="kanban-board"
                aria-label={ariaLabel}
                data-dragging={activeId ? "" : undefined}
                className={cn(
                    "flex gap-3 overflow-x-auto pb-3",
                    // column snapping helps swiping on a phone, but while dragging it turns every
                    // auto-scroll nudge into a jump by a whole column and the card lands next door
                    activeId ? "snap-none" : "snap-x",
                    className
                )}
            >
                {children}
            </div>
            <DragOverlay dropAnimation={null}>
                {activeId && renderOverlay ? (
                    <div className="rotate-2 cursor-grabbing shadow-2xl">
                        {renderOverlay(activeId)}
                    </div>
                ) : null}
            </DragOverlay>
            <KanbanDropZoneBar zones={dropZones} />
        </DndContext>
    );
}
