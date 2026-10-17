export type KanbanDropZoneTone = "success" | "danger" | "neutral";

/** A target that appears at the bottom of the screen while a card is dragged. */
export interface KanbanDropZoneSpec {
    id: string;
    label: string;
    tone: KanbanDropZoneTone;
    /** Overrides the tone colour (a stage colour) */
    color?: string | null;
}

/** Where a dragged card lands among the cards of a column: right before or after `anchorId`. */
export interface KanbanPlacement {
    anchorId: string;
    side: "before" | "after";
}

/** What the pointer is over while dragging: a column (or drop zone) and the slot in it. */
export interface KanbanDropTarget {
    columnId: string;
    /** `null` — the column's empty space under the cards, or a drop zone */
    placement: KanbanPlacement | null;
}

/** Kinds of droppables on the board, kept in their `data.type` */
export const KANBAN_DROPPABLE = {
    column: "kanban-column",
    item: "kanban-item",
    zone: "kanban-zone",
} as const;
