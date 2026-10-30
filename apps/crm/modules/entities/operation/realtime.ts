import type { RealtimeRule } from "@/modules/shared/realtime";

import { operationKeys } from "./model/operation-keys";

export const operationRealtimeRules: readonly RealtimeRule[] = [
    // операция автора завершилась или упала: перечитать её строку — там результат или причина
    {
        events: ["operation.finished", "operation.failed"],
        keys: (event) =>
            event.name === "operation.finished" || event.name === "operation.failed"
                ? [operationKeys.one(event.payload.operationId)]
                : [],
    },
];
