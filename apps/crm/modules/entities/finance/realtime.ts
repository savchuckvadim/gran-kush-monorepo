import type { RealtimeRule } from "@/modules/shared/realtime";

import { financeProfileKeys } from "./model/finance-profile-keys";
import { taxRateKeys } from "./model/tax-rate-keys";

export const financeRealtimeRules: readonly RealtimeRule[] = [
    // профиль организации сохранил другой администратор: форма и шапка финансов у всех
    {
        events: ["finance.profile_updated"],
        keys: () => [financeProfileKeys.all],
    },
    // ставку добавили, изменили или сделали основной: списки ставок в настройках и в товарах
    {
        events: ["finance.tax_rates_changed"],
        keys: () => [taxRateKeys.all],
    },
];
