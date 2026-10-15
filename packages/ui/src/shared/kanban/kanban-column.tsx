"use client";

import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";

export interface KanbanColumnProps {
    id: string;
    header: ReactNode;
    children: ReactNode;
    /** Under the cards: "show more", a loader */
    footer?: ReactNode;
    className?: string;
}

/**
 * A drop target with its own vertical scroll, so a long column does not stretch the board.
 * The column sits on a quiet well: the cards float above it, and a wall of columns reads as
 * columns rather than as one field of cards.
 */
export function KanbanColumn({ id, header, children, footer, className }: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <section
            data-slot="kanban-column"
            data-over={isOver || undefined}
            className={cn(
                "bg-muted/55 flex min-h-0 w-[min(17.5rem,85vw)] shrink-0 snap-start flex-col gap-2.5 rounded-2xl p-2.5",
                className
            )}
        >
            {header}
            <div
                ref={setNodeRef}
                className={cn(
                    "flex min-h-24 flex-1 flex-col gap-2.5 overflow-y-auto rounded-xl transition-colors",
                    isOver && "bg-accent/60"
                )}
            >
                {children}
                {footer}
            </div>
        </section>
    );
}
