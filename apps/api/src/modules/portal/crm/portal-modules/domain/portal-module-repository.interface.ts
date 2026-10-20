import type { PortalTypeEnum } from "@prisma/client";

import type { OutboxTransaction } from "@modules/events";

import type { PortalModuleCode } from "./portal-module.catalog";

export interface EnabledPortalModule {
    code: string;
    enabledAt: Date;
}

/** Включённые модули портала (`portal_modules`): строка есть — модуль включён. */
export abstract class PortalModuleRepository {
    abstract portalType(portalId: string): Promise<PortalTypeEnum | null>;

    abstract findEnabled(portalId: string): Promise<EnabledPortalModule[]>;

    abstract isEnabled(portalId: string, code: PortalModuleCode): Promise<boolean>;

    /**
     * Включить или выключить модуль; `within` выполняется в той же транзакции (хуки модуля,
     * события) — только если состояние действительно изменилось. Возвращает, изменилось ли оно.
     */
    abstract setEnabled(
        change: {
            portalId: string;
            code: PortalModuleCode;
            enabled: boolean;
            employeeId: string;
        },
        within: (tx: OutboxTransaction) => Promise<void>
    ): Promise<boolean>;
}
