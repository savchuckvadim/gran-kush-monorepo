import type { RealtimeRule } from "@/modules/shared/realtime";

import { memberKeys } from "./hooks/member.hook";

/** Вступление, согласие, выход, статус и правка карточки: списки и карточки участников. */
export const memberRealtimeRules: readonly RealtimeRule[] = [
    {
        events: [
            "member.joined",
            "member.consent_given",
            "member.left",
            "member.status_changed",
            "member.updated",
        ],
        keys: () => [memberKeys.all],
    },
];
