import type { RealtimeRule } from "@/modules/shared/realtime";

import { financeProfileKeys } from "./model/finance-profile-keys";
import { counterpartyKeys, financeCategoryKeys, ledgerKeys } from "./model/ledger-keys";
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
    // проводку записали, поправили, отменили, загрузили таблицей или закрыли месяц: реестр,
    // обзор и месяцы у всех, кто открыл финансы; оплата заказа приходит сюда же
    {
        events: [
            "finance.entry_recorded",
            "finance.entry_updated",
            "finance.entry_voided",
            "finance.entries_imported",
            "finance.period_closed",
            "finance.period_reopened",
        ],
        keys: () => [ledgerKeys.all, counterpartyKeys.all],
    },
    {
        events: ["finance.categories_changed"],
        keys: () => [financeCategoryKeys.all],
    },
    {
        events: ["finance.counterparties_changed"],
        keys: () => [counterpartyKeys.all, ledgerKeys.all],
    },
];
