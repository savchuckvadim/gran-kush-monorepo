import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";
import { PORTAL_EVENTS_JOB_OPTIONS } from "@common/queue/job-options";
import { BillingModule } from "@modules/billing/billing.module";
import { SharedAuthModule } from "@modules/portal/auth/shared/shared-auth.module";
import { ClubPolicyModule } from "@modules/portal/crm/club-policy/club-policy.module";
import { EntityFieldsModule } from "@modules/portal/crm/entity-fields/entity-fields.module";
import { MembersModule } from "@modules/portal/crm/members/members.module";
import { CabinetPortalsController } from "@modules/portal/crm/portals/api/controllers/cabinet-portals.controller";
import { CrmMyPortalsController } from "@modules/portal/crm/portals/api/controllers/crm-my-portals.controller";
import { CrmPortalInfoController } from "@modules/portal/crm/portals/api/controllers/crm-portal-info.controller";
import { PortalRegistrationController } from "@modules/portal/crm/portals/api/controllers/portal-registration.controller";
import { PortalResolveController } from "@modules/portal/crm/portals/api/controllers/portal-resolve.controller";
import { ClubFoundingService } from "@modules/portal/crm/portals/application/services/club-founding.service";
import { PortalAppearanceService } from "@modules/portal/crm/portals/application/services/portal-appearance.service";
import { PortalRegistrationService } from "@modules/portal/crm/portals/application/services/portal-registration.service";
import { PORTAL_EVENTS_QUEUE_NAME } from "@modules/portal/crm/portals/events/portal-events.constants";
import { PortalEventsProcessor } from "@modules/portal/crm/portals/infrastructure/processors/portal-events.processor";
import { PortalAppearancePrismaRepository } from "@modules/portal/crm/portals/infrastructure/repositories/portal-appearance-prisma.repository";

import { PortalAppearanceRepository } from "./domain/repositories/portal-appearance-repository.interface";

@Module({
    imports: [
        PrismaModule,
        EntityFieldsModule,
        SharedAuthModule,
        BillingModule,
        MembersModule,
        ClubPolicyModule,
        BullModule.registerQueue({
            name: PORTAL_EVENTS_QUEUE_NAME,
            defaultJobOptions: PORTAL_EVENTS_JOB_OPTIONS,
        }),
    ],
    controllers: [
        PortalRegistrationController,
        PortalResolveController,
        CabinetPortalsController,
        CrmMyPortalsController,
        CrmPortalInfoController,
    ],
    providers: [
        ClubFoundingService,
        PortalRegistrationService,
        PortalEventsProcessor,
        PortalAppearanceService,
        { provide: PortalAppearanceRepository, useClass: PortalAppearancePrismaRepository },
    ],
    exports: [PortalRegistrationService],
})
export class PortalsModule {}
