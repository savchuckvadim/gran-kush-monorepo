"use client";

import { type ReactNode, useMemo, useState } from "react";

import {
    DndContext,
    type DragEndEvent,
    type DragMoveEvent,
    DragOverlay,
    type DragStartEvent,
    MeasuringStrategy,
} from "@dnd-kit/core";

import { cn } from "@workspace/ui/lib/utils";

import type { KanbanDropTarget, KanbanDropZoneSpec, KanbanPlacement } from "./kanban.types";
import { KanbanDragContext } from "./kanban-drop-context";
import { KanbanDropZoneBar } from "./kanban-drop-zone-bar";
import { detectKanbanTarget, dropTargetOf, sameDropTarget } from "./kanban-placement";
import { useKanbanSensors } from "./use-kanban-sensors";

export interface KanbanBoardProps {
    /** {@link KanbanColumn}s */
    children: ReactNode;
    /**
     * A card was dropped: on a column (`placement` — the slot among its cards, `null` — under the
     * last one) or on a drop zone. The same column with a slot is a reorder; the board does not
     * know the order, so the caller decides whether anything moved (see `kanbanAfterId`).
     */
    onMove: (itemId: string, targetId: string, placement: KanbanPlacement | null) => void;
    /** What follows the pointer while dragging */
    renderOverlay?: (itemId: string) => ReactNode;
    /** Targets shown at the bottom of the screen only while dragging (closing stages) */
    dropZones?: readonly KanbanDropZoneSpec[];
    className?: string;
    "aria-label"?: string;
}

// drop zones mount when a drag starts: they must be measured then, not only at its start
const MEASURING = { droppable: { strategy: MeasuringStrategy.Always } };

/**
 * A horizontal board of columns with drag and drop between and inside them. Knows nothing of the
 * items: while dragging it tells the columns and cards where the card would land, and on drop
 * reports the column and slot.
 */
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
    const [target, setTarget] = useState<KanbanDropTarget | null>(null);
    const drag = useMemo(() => ({ activeId, target }), [activeId, target]);

    const reset = () => {
        setActiveId(null);
        setTarget(null);
    };

    const handleDragStart = ({ active }: DragStartEvent) => setActiveId(String(active.id));

    // the slot follows the pointer inside one card too (upper or lower half), not only between cards
    const handleDragMove = ({ active, over }: DragMoveEvent) => {
        const next = dropTargetOf(active, over);
        setTarget((current) => (sameDropTarget(current, next) ? current : next));
    };

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        reset();
        const dropped = dropTargetOf(active, over);
        if (!dropped || dropped.placement?.anchorId === String(active.id)) return;
        onMove(String(active.id), dropped.columnId, dropped.placement);
    };

    return (
        <DndContext
            sensors={sensors}
            measuring={MEASURING}
            collisionDetection={detectKanbanTarget}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragOver={handleDragMove}
            onDragEnd={handleDragEnd}
            onDragCancel={reset}
        >
            <KanbanDragContext value={drag}>
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
            </KanbanDragContext>
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
