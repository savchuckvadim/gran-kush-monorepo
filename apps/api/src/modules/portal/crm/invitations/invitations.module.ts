import { Module } from "@nestjs/common";

import { MailModule } from "@mail/mail.module";
import { UsersModule } from "@users/users.module";

import { CookieModule } from "@common/cookie/cookie.module";
import { PrismaModule } from "@common/prisma/prisma.module";
import { EmployeeAuthModule } from "@modules/portal/auth/employees/employee-auth.module";
import { SharedAuthModule } from "@modules/portal/auth/shared/shared-auth.module";
import { AccessModule } from "@modules/portal/crm/access/access.module";
import { EmployeesModule } from "@modules/portal/crm/employees/employees.module";

import { CabinetInvitationsController } from "./api/controllers/cabinet-invitations.controller";
import { CrmInvitationsController } from "./api/controllers/crm-invitations.controller";
import { CrmSessionInvitationsController } from "./api/controllers/crm-session-invitations.controller";
import { PublicInvitationsController } from "./api/controllers/public-invitations.controller";
import { InvitationAcceptanceService } from "./application/services/invitation-acceptance.service";
import { InvitationsService } from "./application/services/invitations.service";

@Module({
    imports: [
        CookieModule,
        PrismaModule,
        UsersModule,
        EmployeesModule,
        AccessModule,
        EmployeeAuthModule,
        SharedAuthModule,
        MailModule,
    ],
    controllers: [
        CrmInvitationsController,
        PublicInvitationsController,
        CrmSessionInvitationsController,
        CabinetInvitationsController,
    ],
    providers: [InvitationsService, InvitationAcceptanceService],
    exports: [InvitationsService, InvitationAcceptanceService],
})
export class InvitationsModule {}
