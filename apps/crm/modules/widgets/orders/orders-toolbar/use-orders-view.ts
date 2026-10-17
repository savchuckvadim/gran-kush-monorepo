"use client";

import { type BoardView, useBoardView } from "@/modules/shared/lib/use-board-view";

export type OrdersView = BoardView;

/** Orders: list or kanban and the funnel in the address, the last view kept on this device. */
export const useOrdersView = () => useBoardView("crm.orders.view");
