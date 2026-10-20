import { Module } from "@nestjs/common";

import { CatalogModule } from "@modules/portal/crm/catalog/catalog.module";
import { PresenceModule } from "@modules/portal/crm/presence/presence.module";

import { CrmScanController } from "./api/controllers/crm-scan.controller";
import { ResolveScanUseCase } from "./application/use-cases/resolve-scan.use-case";

/** Сканер CRM (TASK-807): один вход для кодов участников, этикеток и штрихкодов. */
@Module({
    imports: [CatalogModule, PresenceModule],
    providers: [ResolveScanUseCase],
    controllers: [CrmScanController],
})
export class ScanModule {}
