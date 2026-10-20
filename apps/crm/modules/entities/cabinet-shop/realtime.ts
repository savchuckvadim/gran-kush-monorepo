import type { RealtimeRule } from "@/modules/shared/realtime";

import { cabinetShopKey } from "./hooks/cabinet-shop.hook";

/** Клуб изменил товар или его остаток: витрина участника. */
export const cabinetShopRealtimeRules: readonly RealtimeRule[] = [
    {
        events: ["product.changed", "product.stock_changed"],
        keys: (_event, { portal }) => (portal ? [cabinetShopKey(portal, "products")] : []),
    },
];
