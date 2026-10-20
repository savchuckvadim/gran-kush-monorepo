import { Injectable, OnModuleInit } from "@nestjs/common";

import { VatRegime } from "@prisma/client";

import type { OutboxTransaction } from "@modules/events";
import {
    type PortalModuleLifecycle,
    PortalModuleRegistry,
} from "@modules/portal/crm/portal-modules/application/portal-module.registry";

import { OrganizationProfileRepository } from "../domain/repositories/organization-profile-repository.interface";

import { TaxRatesService } from "./services/tax-rates.service";

/**
 * Включение финансов клуба: ставки налога Испании, по умолчанию — ставка режима IVA профиля
 * (до настройки профиля — general). Повторное включение недостающее досоздаёт, своё не трогает.
 */
@Injectable()
export class FinanceModuleLifecycle implements PortalModuleLifecycle, OnModuleInit {
    readonly code = "finance";

    constructor(
        private readonly registry: PortalModuleRegistry,
        private readonly taxRates: TaxRatesService,
        private readonly profiles: OrganizationProfileRepository
    ) {}

    onModuleInit(): void {
        this.registry.register(this);
    }

    async onEnable(portalId: string, tx: OutboxTransaction): Promise<void> {
        const settings = await this.profiles.findTaxSettings(portalId);
        await this.taxRates.seedPresets(portalId, settings?.vatRegime ?? VatRegime.general, tx);
    }
}
