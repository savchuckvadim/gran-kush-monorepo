import { Module } from "@nestjs/common";

import { EmployeeAuthModule } from "@auth/employees/employee-auth.module";
import { SharedAuthModule } from "@auth/shared/shared-auth.module";

import { PrismaModule } from "@common/prisma/prisma.module";
import { PortalRegistrationController } from "@modules/portals/api/controllers/portal-registration.controller";
import { PortalRegistrationService } from "@modules/portals/application/services/portal-registration.service";

@Module({
    imports: [PrismaModule, EmployeeAuthModule, SharedAuthModule],
    controllers: [PortalRegistrationController],
    providers: [PortalRegistrationService],
    exports: [PortalRegistrationService],
})
export class PortalsModule {}
