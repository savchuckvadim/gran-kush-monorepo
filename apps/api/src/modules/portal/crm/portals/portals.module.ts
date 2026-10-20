import { Module } from "@nestjs/common";

import { UsersModule } from "@users/users.module";

import { PrismaModule } from "@common/prisma/prisma.module";
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
import { PlatformAlertConsumer } from "@modules/portal/crm/portals/application/consumers/platform-alert.consumer";
import { WelcomeLetterConsumer } from "@modules/portal/crm/portals/application/consumers/welcome-letter.consumer";
import { ClubFoundingService } from "@modules/portal/crm/portals/application/services/club-founding.service";
import { PortalAppearanceService } from "@modules/portal/crm/portals/application/services/portal-appearance.service";
import { PortalRegistrationService } from "@modules/portal/crm/portals/application/services/portal-registration.service";
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
        UsersModule,
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
        WelcomeLetterConsumer,
        PlatformAlertConsumer,
        PortalAppearanceService,
        { provide: PortalAppearanceRepository, useClass: PortalAppearancePrismaRepository },
    ],
    exports: [PortalRegistrationService],
})
export class PortalsModule {}
