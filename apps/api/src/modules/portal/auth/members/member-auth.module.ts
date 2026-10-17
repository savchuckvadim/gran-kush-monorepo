import { Module } from "@nestjs/common";

import { MailModule } from "@mail/mail.module";
import { UsersModule } from "@users/users.module";

import { PrismaModule } from "@common/prisma/prisma.module";
import { MemberAuthController } from "@modules/portal/auth/members/api/controllers/member-auth.controller";
import { MemberMobileAuthController } from "@modules/portal/auth/members/api/controllers/member-mobile-auth.controller";
import { MemberRegistrationController } from "@modules/portal/auth/members/api/controllers/member-registration.controller";
import { MemberAuthService } from "@modules/portal/auth/members/application/services/member-auth.service";
import { MemberRegistrationService } from "@modules/portal/auth/members/application/services/member-registration.service";
import { SharedAuthModule } from "@modules/portal/auth/shared/shared-auth.module";
import { EntityFieldsModule } from "@modules/portal/crm/entity-fields/entity-fields.module";
import { MembersModule } from "@modules/portal/crm/members/members.module";

import { MemberRegistrationUseCase } from "./application/use-cases/member-registration.service";

/** Вход и регистрация в кабинете (веб и натив). Сессии — `SessionsModule`. */
@Module({
    imports: [
        PrismaModule,
        MailModule,
        SharedAuthModule,
        EntityFieldsModule,
        MembersModule,
        UsersModule,
    ],
    providers: [MemberRegistrationUseCase, MemberAuthService, MemberRegistrationService],
    controllers: [MemberAuthController, MemberMobileAuthController, MemberRegistrationController],
    exports: [MemberAuthService, MemberRegistrationService],
})
export class MemberAuthModule {}
