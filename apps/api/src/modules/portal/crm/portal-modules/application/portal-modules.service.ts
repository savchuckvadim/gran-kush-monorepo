import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { DomainEventPublisher, employeeActor } from "@modules/events";

import {
    isModuleAvailable,
    PORTAL_MODULE_CODES,
    type PortalModuleCode,
} from "../domain/portal-module.catalog";
import { PortalModuleRepository } from "../domain/portal-module-repository.interface";

import { PortalModuleRegistry } from "./portal-module.registry";

export interface PortalModuleState {
    code: PortalModuleCode;
    /** Модуль доступен типу портала */
    available: boolean;
    enabled: boolean;
    enabledAt: Date | null;
}

/** Код 400: модуль не предусмотрен для типа портала (например, будущая запись — для клуба) */
export const MODULE_NOT_AVAILABLE = "module_not_available";

/**
 * Модули портала: что доступно типу портала и что включено. Включение — одна транзакция: строка
 * модуля, его хук (пресеты) и событие `portal.module_changed` (меню CRM обновляется у всех).
 */
@Injectable()
export class PortalModulesService {
    constructor(
        private readonly repository: PortalModuleRepository,
        private readonly registry: PortalModuleRegistry,
        private readonly events: DomainEventPublisher
    ) {}

    async list(portalId: string): Promise<PortalModuleState[]> {
        const type = await this.repository.portalType(portalId);
        if (!type) throw new NotFoundException("Portal not found");
        const enabled = new Map(
            (await this.repository.findEnabled(portalId)).map((row) => [row.code, row.enabledAt])
        );
        return PORTAL_MODULE_CODES.map((code) => ({
            code,
            available: isModuleAvailable(code, type),
            enabled: enabled.has(code),
            enabledAt: enabled.get(code) ?? null,
        }));
    }

    async enabledCodes(portalId: string): Promise<PortalModuleCode[]> {
        return (await this.list(portalId)).filter((m) => m.enabled).map((m) => m.code);
    }

    isEnabled(portalId: string, code: PortalModuleCode): Promise<boolean> {
        return this.repository.isEnabled(portalId, code);
    }

    async setEnabled(
        portalId: string,
        code: PortalModuleCode,
        enabled: boolean,
        employeeId: string
    ): Promise<PortalModuleState> {
        const type = await this.repository.portalType(portalId);
        if (!type) throw new NotFoundException("Portal not found");
        if (enabled && !isModuleAvailable(code, type)) {
            throw new BadRequestException({
                message: `Module ${code} is not available for this portal`,
                code: MODULE_NOT_AVAILABLE,
            });
        }
        await this.repository.setEnabled({ portalId, code, enabled, employeeId }, async (tx) => {
            if (enabled) await this.registry.lifecycleOf(code)?.onEnable(portalId, tx);
            await this.events.publish(tx, {
                name: "portal.module_changed",
                portalId,
                actor: employeeActor(employeeId),
                aggregateId: portalId,
                payload: { module: code, enabled },
            });
        });
        const state = (await this.list(portalId)).find((m) => m.code === code);
        if (!state) throw new NotFoundException("Module not found");
        return state;
    }
}
