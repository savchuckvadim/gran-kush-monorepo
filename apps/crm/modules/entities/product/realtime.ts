import type { RealtimeRule } from "@/modules/shared/realtime";

import { PRODUCT_KEYS } from "./hooks/product.hook";

/** Товар правят в CRM, остаток двигают заказы: каталог и карточки товаров. */
export const productRealtimeRules: readonly RealtimeRule[] = [
    {
        events: ["product.changed", "product.stock_changed"],
        keys: () => [PRODUCT_KEYS.all],
    },
];
