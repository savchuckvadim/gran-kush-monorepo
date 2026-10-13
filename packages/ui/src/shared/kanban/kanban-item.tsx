"use client";

import { useDraggable } from "@dnd-kit/core";
import type { ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";

export interface KanbanItemProps {
    id: string;
    /** The column the item stands in: a drop back onto it is not a move */
    columnId: string;
    disabled?: boolean;
    children: ReactNode;
    className?: string;
}

/** A draggable card slot; while dragging, the overlay follows the pointer and this stays dimmed. */
export function KanbanItem({
    id,
    columnId,
    disabled = false,
    children,
    className,
}: KanbanItemProps) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id,
        data: { columnId },
        disabled,
    });

    return (
        <div
            ref={setNodeRef}
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
    );
}
