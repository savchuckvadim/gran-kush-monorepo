import { authKeys } from "@/modules/entities/auth";
import type { RealtimeRule } from "@/modules/shared/realtime";

import { rolesKey } from "./keys";

/**
 * Права в клубе: экран ролей и собственный профиль сотрудника — меню и кнопки следуют новым правам
 * без перезагрузки.
 */
export const accessRealtimeRules: readonly RealtimeRule[] = [
    {
        events: ["role.changed", "employee.access_changed"],
        keys: () => [rolesKey, authKeys.current()],
    },
];
