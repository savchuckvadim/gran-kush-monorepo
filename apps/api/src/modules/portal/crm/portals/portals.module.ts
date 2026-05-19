import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";
import { EmployeeAuthModule } from "@modules/portal/auth/employees/employee-auth.module";
import { SharedAuthModule } from "@modules/portal/auth/shared/shared-auth.module";
import { EntityFieldsModule } from "@modules/portal/crm/entity-fields/entity-fields.module";
import { PortalRegistrationController } from "@modules/portal/crm/portals/api/controllers/portal-registration.controller";
import { PortalRegistrationService } from "@modules/portal/crm/portals/application/services/portal-registration.service";
import { PORTAL_EVENTS_QUEUE_NAME } from "@modules/portal/crm/portals/events/portal-events.constants";
import { PortalEventsProcessor } from "@modules/portal/crm/portals/infrastructure/processors/portal-events.processor";

@Module({
    imports: [
        PrismaModule,
        EntityFieldsModule,
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
