import { Module } from "@nestjs/common";

import { EmployeeAuthModule } from "@modules/portal/auth/employees/employee-auth.module";
import { MemberAuthModule } from "@modules/portal/auth/members/member-auth.module";
import { SharedAuthModule } from "@modules/portal/auth/shared/shared-auth.module";
import { SocialAuthModule } from "@modules/portal/auth/social/social-auth.module";

/**
 * Главный модуль аутентификации
 * Импортирует модули для аутентификации сотрудников и членов
 */
@Module({
    imports: [EmployeeAuthModule, MemberAuthModule, SharedAuthModule, SocialAuthModule],
    exports: [EmployeeAuthModule, MemberAuthModule, SharedAuthModule],
})
export class AuthModule {}
