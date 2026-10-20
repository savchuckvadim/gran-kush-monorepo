import type { RealtimeRule } from "@/modules/shared/realtime";

import { cabinetShopKey } from "./hooks/cabinet-shop.hook";

/** Клуб изменил товар, остаток или ставку налога (цена «налог сверху»): витрина участника. */
export const cabinetShopRealtimeRules: readonly RealtimeRule[] = [
    {
        events: ["product.changed", "product.stock_changed", "finance.tax_rates_changed"],
        keys: (_event, { portal }) => (portal ? [cabinetShopKey(portal, "products")] : []),
    },
];
