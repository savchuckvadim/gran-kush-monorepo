import { Module } from "@nestjs/common";

import { AccountSecurityModule } from "@modules/portal/auth/account-security/account-security.module";
import { EmployeeAuthModule } from "@modules/portal/auth/employees/employee-auth.module";
import { MemberAuthModule } from "@modules/portal/auth/members/member-auth.module";
import { SharedAuthModule } from "@modules/portal/auth/shared/shared-auth.module";
import { SocialAuthModule } from "@modules/portal/auth/social/social-auth.module";

/**
 * Главный модуль аутентификации
 * Импортирует модули для аутентификации сотрудников и членов
 */
@Module({
    imports: [
        EmployeeAuthModule,
        MemberAuthModule,
        SharedAuthModule,
        SocialAuthModule,
        AccountSecurityModule,
    ],
    exports: [EmployeeAuthModule, MemberAuthModule, SharedAuthModule],
})
export class AuthModule {}
