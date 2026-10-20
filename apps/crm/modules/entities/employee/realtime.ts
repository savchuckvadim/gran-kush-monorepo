import type { RealtimeRule } from "@/modules/shared/realtime";

import { employeeKeys } from "./model/employee-keys";

/** Новый сотрудник, смена роли или отключение: список команды и карточки. */
export const employeeRealtimeRules: readonly RealtimeRule[] = [
    {
        events: ["employee.joined", "employee.access_changed"],
        keys: () => [employeeKeys.all],
    },
];
