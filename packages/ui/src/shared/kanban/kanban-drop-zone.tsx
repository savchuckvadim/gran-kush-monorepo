"use client";

import { useDroppable } from "@dnd-kit/core";

import { cn } from "@workspace/ui/lib/utils";

import type { KanbanDropZoneSpec, KanbanDropZoneTone } from "./kanban.types";

const TONE: Readonly<Record<KanbanDropZoneTone, string>> = {
    success: "border-success text-success",
    danger: "border-destructive text-destructive",
    neutral: "border-border text-muted-foreground",
};

/** A labelled drop target; the dashed frame turns solid while a card hovers it. */
export function KanbanDropZone({ id, label, tone, color }: KanbanDropZoneSpec) {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <div
            ref={setNodeRef}
            data-slot="kanban-drop-zone"
            data-tone={tone}
            data-over={isOver || undefined}
            className={cn(
                "flex h-16 min-w-0 flex-1 items-center justify-center rounded-xl border-2 border-dashed px-3 text-center text-sm font-semibold transition-[background-color,transform]",
                !color && TONE[tone],
                isOver && "scale-[1.02] border-solid bg-accent"
            )}
            style={color ? { borderColor: color, color } : undefined}
        >
            <span className="truncate">{label}</span>
        </div>
    );
}
