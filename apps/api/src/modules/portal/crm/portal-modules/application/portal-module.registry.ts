import { Injectable } from "@nestjs/common";

import type { OutboxTransaction } from "@modules/events";

import type { PortalModuleCode } from "../domain/portal-module.catalog";

/**
 * Что модуль делает при включении (пресеты, первичные данные). Регистрирует сам модуль — общий
 * механизм модулей о финансах или записи ничего не знает.
 */
export interface PortalModuleLifecycle {
    readonly code: PortalModuleCode;
    /** В транзакции включения: упал — модуль не включится. Повторное включение не дублирует данные */
    onEnable(portalId: string, tx: OutboxTransaction): Promise<void>;
}

@Injectable()
export class PortalModuleRegistry {
    private readonly lifecycles = new Map<PortalModuleCode, PortalModuleLifecycle>();

    register(lifecycle: PortalModuleLifecycle): void {
        if (this.lifecycles.has(lifecycle.code)) {
            throw new Error(`Portal module ${lifecycle.code} is registered twice`);
        }
        this.lifecycles.set(lifecycle.code, lifecycle);
    }

    lifecycleOf(code: PortalModuleCode): PortalModuleLifecycle | undefined {
        return this.lifecycles.get(code);
    }
}
