import { cabinetShopKey } from "@/modules/entities/cabinet-shop/hooks/cabinet-shop.hook";
import type { RealtimeRule } from "@/modules/shared/realtime";

import { cabinetOrdersKey } from "./hooks/cabinet-order.hook";

/** Свой заказ участника: список и карточка, и остаток лимита — заказ и отмена его двигают. */
export const cabinetOrderRealtimeRules: readonly RealtimeRule[] = [
    {
        events: ["order.placed", "order.stage_changed", "order.cancelled", "order.payment_changed"],
        keys: (_event, { portal }) =>
            portal ? [cabinetOrdersKey(portal), cabinetShopKey(portal, "monthly-limit")] : [],
    },
];
