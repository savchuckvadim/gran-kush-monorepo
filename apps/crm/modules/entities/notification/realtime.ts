import type { RealtimeRule } from "@/modules/shared/realtime";

import { notificationKeys } from "./model/notification-keys";

/** Новое личное уведомление: значок колокольчика и список — у адресата. */
export const notificationRealtimeRules: readonly RealtimeRule[] = [
    {
        events: ["notification.created"],
        keys: () => [notificationKeys.all],
    },
];
