"use client";

import { createContext, useContext } from "react";

import type { KanbanDropTarget } from "./kanban.types";

export interface KanbanDragState {
    activeId: string | null;
    target: KanbanDropTarget | null;
}

const IDLE: KanbanDragState = { activeId: null, target: null };

/** The drag in progress, for columns and cards to show where the card would land. */
export const KanbanDragContext = createContext<KanbanDragState>(IDLE);

export const useKanbanDrag = (): KanbanDragState => useContext(KanbanDragContext);
