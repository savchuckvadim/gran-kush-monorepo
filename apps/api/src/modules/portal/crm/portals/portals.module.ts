import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";
import { EmployeeAuthModule } from "@modules/portal/auth/employees/employee-auth.module";
import { SharedAuthModule } from "@modules/portal/auth/shared/shared-auth.module";
import { EntityFieldsModule } from "@modules/portal/crm/entity-fields/entity-fields.module";
import { MembersModule } from "@modules/portal/crm/members/members.module";
import { CrmMyPortalsController } from "@modules/portal/crm/portals/api/controllers/crm-my-portals.controller";
import { CrmPortalInfoController } from "@modules/portal/crm/portals/api/controllers/crm-portal-info.controller";
import { LkPortalsController } from "@modules/portal/crm/portals/api/controllers/lk-portals.controller";
import { PortalRegistrationController } from "@modules/portal/crm/portals/api/controllers/portal-registration.controller";
import { PortalResolveController } from "@modules/portal/crm/portals/api/controllers/portal-resolve.controller";
import { PortalRegistrationService } from "@modules/portal/crm/portals/application/services/portal-registration.service";
import { PORTAL_EVENTS_QUEUE_NAME } from "@modules/portal/crm/portals/events/portal-events.constants";
import { PortalEventsProcessor } from "@modules/portal/crm/portals/infrastructure/processors/portal-events.processor";

@Module({
    imports: [
        PrismaModule,
        EntityFieldsModule,
        EmployeeAuthModule,
        SharedAuthModule,
        MembersModule,
        BullModule.registerQueue({
            name: PORTAL_EVENTS_QUEUE_NAME,
        }),
    ],
    controllers: [
        PortalRegistrationController,
        PortalResolveController,
        LkPortalsController,
        CrmMyPortalsController,
        CrmPortalInfoController,
    ],
    providers: [PortalRegistrationService, PortalEventsProcessor],
    exports: [PortalRegistrationService],
})
export class PortalsModule {}
