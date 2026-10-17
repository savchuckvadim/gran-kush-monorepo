import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";

import { CrmRolesController } from "./api/controllers/crm-roles.controller";
import { PortalRolesService } from "./application/services/portal-roles.service";
import { PortalRoleRepository } from "./domain/portal-role-repository.interface";
import { PortalRolePrismaRepository } from "./infrastructure/portal-role-prisma.repository";

/** Роли клуба и права сотрудников (TASK-730…732). */
@Module({
    imports: [PrismaModule],
    controllers: [CrmRolesController],
    providers: [
        PortalRolesService,
        { provide: PortalRoleRepository, useClass: PortalRolePrismaRepository },
    ],
    exports: [PortalRolesService],
})
export class AccessModule {}
