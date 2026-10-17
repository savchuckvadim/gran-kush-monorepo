import type { Active, Collision, CollisionDetection, Over } from "@dnd-kit/core";
import { closestCorners, pointerWithin } from "@dnd-kit/core";

import { KANBAN_DROPPABLE, type KanbanDropTarget, type KanbanPlacement } from "./kanban.types";

const typeOf = (collision: Collision): unknown =>
    collision.data?.droppableContainer?.data?.current?.type;

/** A drop zone over the board beats the card under it, a card beats its column. */
const priority = (collision: Collision): number => {
    const type = typeOf(collision);
    if (type === KANBAN_DROPPABLE.zone) return 0;
    if (type === KANBAN_DROPPABLE.item) return 1;
    return 2;
};

const columnIdOf = (collision: Collision): unknown =>
    collision.data?.droppableContainer?.data?.current?.columnId;

/**
 * What the pointer is over. The card under the pointer says where in the column the dragged one
 * lands. Over nothing (the column header, the gap between columns, the page) there is no target
 * and a drop is a no-op — the only way to cancel with a finger. Only a keyboard drag has no pointer
 * and takes the closest target.
 *
 * Droppable rects are not clipped by the scroll of their column, so a card scrolled out of sight
 * would still match the pointer over the column's header: a card counts only while the pointer is
 * also over its column's visible list.
 */
export const detectKanbanTarget: CollisionDetection = (args) => {
    if (!args.pointerCoordinates) return closestCorners(args);

    const hits = pointerWithin(args);
    const overColumns = new Set(
        hits.filter((hit) => typeOf(hit) === KANBAN_DROPPABLE.column).map((hit) => String(hit.id))
    );
    return hits
        .filter(
            (hit) =>
                typeOf(hit) !== KANBAN_DROPPABLE.item || overColumns.has(String(columnIdOf(hit)))
        )
        .sort((a, b) => priority(a) - priority(b));
};

/** The column and slot under the dragged card: above or below the middle of the card it covers. */
export const dropTargetOf = (active: Active, over: Over | null): KanbanDropTarget | null => {
    if (!over) return null;
    const data = over.data.current;
    if (data?.type !== KANBAN_DROPPABLE.item || typeof data.columnId !== "string") {
        return { columnId: String(over.id), placement: null };
    }
    const dragged = active.rect.current.translated;
    const middle = over.rect.top + over.rect.height / 2;
    const center = dragged ? dragged.top + dragged.height / 2 : middle;
    return {
        columnId: data.columnId,
        placement: { anchorId: String(over.id), side: center < middle ? "before" : "after" },
    };
};

export const sameDropTarget = (a: KanbanDropTarget | null, b: KanbanDropTarget | null): boolean =>
    a?.columnId === b?.columnId &&
    a?.placement?.anchorId === b?.placement?.anchorId &&
    a?.placement?.side === b?.placement?.side;

/**
 * The card a dropped one goes under, for the server's `afterId`: `ids` are the column's cards in
 * order. `null` — the top. Dropped on the column itself — under its last card.
 */
export const kanbanAfterId = (
    ids: readonly string[],
    movingId: string,
    placement: KanbanPlacement | null
): string | null => {
    const rest = ids.filter((id) => id !== movingId);
    const index = placement ? rest.indexOf(placement.anchorId) : -1;
    if (!placement || index < 0) return rest.at(-1) ?? null;
    return placement.side === "after" ? placement.anchorId : (rest[index - 1] ?? null);
};

/** In its own column the card goes back under the same neighbour: nothing to move. */
export const kanbanStaysPut = (
    ids: readonly string[],
    movingId: string,
    afterId: string | null
): boolean => {
    const index = ids.indexOf(movingId);
    return index >= 0 && (ids[index - 1] ?? null) === afterId;
};
