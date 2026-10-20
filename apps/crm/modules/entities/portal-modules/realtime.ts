import { portalInfoKeys } from "@/modules/entities/portal/model/portal-info-keys";
import type { RealtimeRule } from "@/modules/shared/realtime";

import { portalModuleKeys } from "./model/portal-module-keys";

/** Модуль включили или выключили: меню и экраны модуля у всех сотрудников клуба. */
export const portalModuleRealtimeRules: readonly RealtimeRule[] = [
    {
        events: ["portal.module_changed"],
        keys: () => [portalModuleKeys.all, portalInfoKeys.all],
    },
];
