export type KanbanDropZoneTone = "success" | "danger" | "neutral";

/** A target that appears at the bottom of the screen while a card is dragged. */
export interface KanbanDropZoneSpec {
    id: string;
    label: string;
    tone: KanbanDropZoneTone;
    /** Overrides the tone colour (a stage colour) */
    color?: string | null;
}
