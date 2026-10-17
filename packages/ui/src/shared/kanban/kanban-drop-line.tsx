"use client";

import { cn } from "@workspace/ui/lib/utils";

/** The line that shows where a dragged card lands: between two cards or under the last one. */
export function KanbanDropLine({ className }: { className?: string }) {
    return (
        <span
            aria-hidden="true"
            data-slot="kanban-drop-line"
            className={cn("bg-primary pointer-events-none block h-0.5 rounded-full", className)}
        />
    );
}
