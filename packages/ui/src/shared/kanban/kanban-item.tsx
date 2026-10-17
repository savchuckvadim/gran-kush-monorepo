"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";

import { KANBAN_DROPPABLE } from "./kanban.types";
import { useKanbanDrag } from "./kanban-drop-context";
import { KanbanDropLine } from "./kanban-drop-line";

export interface KanbanItemProps {
    id: string;
    /** The column the item stands in: a drop next to it lands in this column */
    columnId: string;
    disabled?: boolean;
    children: ReactNode;
    className?: string;
}

/**
 * A draggable card slot and a drop target at once: a card dragged over its upper or lower half
 * lands before or after it, and the line shows that. While dragging, the overlay follows the
 * pointer and this stays dimmed.
 */
export function KanbanItem({
    id,
    columnId,
    disabled = false,
    children,
    className,
}: KanbanItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef: setDragRef,
        isDragging,
    } = useDraggable({ id, data: { columnId }, disabled });
    const { setNodeRef: setDropRef } = useDroppable({
        id,
        data: { type: KANBAN_DROPPABLE.item, columnId },
    });
    const { activeId, target } = useKanbanDrag();
    const side =
        activeId !== null && activeId !== id && target?.placement?.anchorId === id
            ? target.placement.side
            : null;

    return (
        // pb-2.5 is the gap to the next card: it belongs to this slot, so the pointer in the gap
        // still resolves to a card, not to the column
        <div ref={setDropRef} data-slot="kanban-item-slot" className="relative pb-2.5">
            {side === "before" ? <KanbanDropLine className="absolute inset-x-1 -top-1.5" /> : null}
            <div
                ref={setDragRef}
                data-slot="kanban-item"
                data-dragging={isDragging || undefined}
                className={cn(
                    "touch-manipulation rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    !disabled && "cursor-grab active:cursor-grabbing",
                    isDragging && "opacity-40",
                    className
                )}
                {...attributes}
                {...listeners}
            >
                {children}
            </div>
            {side === "after" ? (
                <KanbanDropLine className="absolute inset-x-1 bottom-1" />
            ) : null}
        </div>
    );
}
