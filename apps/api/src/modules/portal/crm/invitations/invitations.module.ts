import { Module } from "@nestjs/common";

import { MailModule } from "@mail/mail.module";
import { UsersModule } from "@users/users.module";

import { PrismaModule } from "@common/prisma/prisma.module";
import { EmployeeAuthModule } from "@modules/portal/auth/employees/employee-auth.module";
import { SharedAuthModule } from "@modules/portal/auth/shared/shared-auth.module";
import { EmployeesModule } from "@modules/portal/crm/employees/employees.module";

import { CrmInvitationsController } from "./api/controllers/crm-invitations.controller";
import { PublicInvitationsController } from "./api/controllers/public-invitations.controller";
import { InvitationsService } from "./application/services/invitations.service";

@Module({
    imports: [
        PrismaModule,
        UsersModule,
        EmployeesModule,
        EmployeeAuthModule,
        SharedAuthModule,
        MailModule,
    ],
    controllers: [CrmInvitationsController, PublicInvitationsController],
    providers: [InvitationsService],
    exports: [InvitationsService],
})
export class InvitationsModule {}
