import { Module } from "@nestjs/common";

import { AccountSecurityModule } from "@modules/portal/auth/account-security/account-security.module";
import { EmployeeAuthModule } from "@modules/portal/auth/employees/employee-auth.module";
import { MemberAuthModule } from "@modules/portal/auth/members/member-auth.module";
import { SessionsModule } from "@modules/portal/auth/sessions/sessions.module";
import { SharedAuthModule } from "@modules/portal/auth/shared/shared-auth.module";
import { SocialAuthModule } from "@modules/portal/auth/social/social-auth.module";

/**
 * Аутентификация: сессии (глобальный модуль), вход паролем в CRM и кабинет, способы входа и аккаунт.
 * Схема — documentation/backend/AUTH_ARCHITECTURE.md.
 */
@Module({
    imports: [
        SessionsModule,
        EmployeeAuthModule,
        MemberAuthModule,
        SharedAuthModule,
        SocialAuthModule,
        AccountSecurityModule,
    ],
    exports: [EmployeeAuthModule, MemberAuthModule, SharedAuthModule],
})
export class AuthModule {}
