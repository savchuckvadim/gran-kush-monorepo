import { Global, Module } from "@nestjs/common";

import { PortalModuleGuard } from "@common/portal/portal-module.guard";
import { PrismaModule } from "@common/prisma/prisma.module";

import { CrmPortalModulesController } from "./api/crm-portal-modules.controller";
import { PortalModuleRegistry } from "./application/portal-module.registry";
import { PortalModulesService } from "./application/portal-modules.service";
import { PortalModuleRepository } from "./domain/portal-module-repository.interface";
import { PortalModulePrismaRepository } from "./infrastructure/portal-module-prisma.repository";

/**
 * Подключаемые модули портала (TASK-796): каталог, включение с хуками модулей, guard маршрутов.
 * Глобальный: guard стоит в `CrmAuth({ module })` контроллеров любых модулей, а модули
 * регистрируют свои хуки включения в `PortalModuleRegistry`.
 */
@Global()
@Module({
    imports: [PrismaModule],
    controllers: [CrmPortalModulesController],
    providers: [
        PortalModulesService,
        PortalModuleRegistry,
        PortalModuleGuard,
        { provide: PortalModuleRepository, useClass: PortalModulePrismaRepository },
    ],
    exports: [PortalModulesService, PortalModuleRegistry, PortalModuleGuard],
})
export class PortalModulesModule {}
