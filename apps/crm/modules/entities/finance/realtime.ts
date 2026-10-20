import type { RealtimeRule } from "@/modules/shared/realtime";

import { financeProfileKeys } from "./model/finance-profile-keys";

/** Профиль организации сохранил другой администратор: форма и шапка финансов у всех. */
export const financeRealtimeRules: readonly RealtimeRule[] = [
    {
        events: ["finance.profile_updated"],
        keys: () => [financeProfileKeys.all],
    },
];
