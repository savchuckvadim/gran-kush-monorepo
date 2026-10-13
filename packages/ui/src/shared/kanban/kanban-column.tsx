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

/** A drop target with its own vertical scroll, so a long column does not stretch the board. */
export function KanbanColumn({ id, header, children, footer, className }: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <section
            data-slot="kanban-column"
            data-over={isOver || undefined}
            className={cn(
                "flex min-h-0 w-[min(17.5rem,85vw)] shrink-0 snap-start flex-col",
                className
            )}
        >
            {header}
            <div
                ref={setNodeRef}
                className={cn(
                    "mt-2 flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto rounded-xl p-1 transition-colors",
                    isOver && "bg-accent/60"
                )}
            >
                {children}
                {footer}
            </div>
        </section>
    );
}
