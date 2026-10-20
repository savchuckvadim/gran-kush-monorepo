import type { RealtimeRule } from "@/modules/shared/realtime";

import { orderKeys } from "./model/order-keys";

/** Любая перемена заказа: список, колонки канбана с их итогами и карточка лежат под `all`. */
export const orderRealtimeRules: readonly RealtimeRule[] = [
    {
        events: ["order.placed", "order.stage_changed", "order.cancelled", "order.payment_changed"],
        keys: () => [orderKeys.all],
    },
];
