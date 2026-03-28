import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";

import { EmployeeAuthModule } from "@auth/employees/employee-auth.module";
import { SharedAuthModule } from "@auth/shared/shared-auth.module";

import { PrismaModule } from "@common/prisma/prisma.module";
import { PortalRegistrationController } from "@modules/portals/api/controllers/portal-registration.controller";
import { PortalRegistrationService } from "@modules/portals/application/services/portal-registration.service";
import { PORTAL_EVENTS_QUEUE_NAME } from "@modules/portals/events/portal-events.constants";
import { PortalEventsProcessor } from "@modules/portals/infrastructure/processors/portal-events.processor";

@Module({
    imports: [
        PrismaModule,
        EmployeeAuthModule,
        SharedAuthModule,
        BullModule.registerQueue({
            name: PORTAL_EVENTS_QUEUE_NAME,
        }),
    ],
    controllers: [PortalRegistrationController],
    providers: [PortalRegistrationService, PortalEventsProcessor],
    exports: [PortalRegistrationService],
})
export class PortalsModule {}
