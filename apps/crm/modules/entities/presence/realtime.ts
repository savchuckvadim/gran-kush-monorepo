import type { RealtimeRule } from "@/modules/shared/realtime";

import { PRESENCE_KEYS } from "./hooks/presence.hook";

/** Вход и выход: «сейчас в клубе», визиты и статистика посещаемости. */
export const presenceRealtimeRules: readonly RealtimeRule[] = [
    {
        events: ["presence.entered", "presence.left"],
        keys: () => [PRESENCE_KEYS.all],
    },
];
