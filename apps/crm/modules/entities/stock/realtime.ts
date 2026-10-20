import type { RealtimeRule } from "@/modules/shared/realtime";

import { stockKeys } from "./model/stock-keys";

export const stockRealtimeRules: readonly RealtimeRule[] = [
    // остаток двинулся (заказ, поставка, списание): журнал, остатки и маржа у всех, кто их открыл
    {
        events: ["product.stock_changed"],
        keys: () => [stockKeys.all],
    },
];
