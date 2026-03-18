import { Module } from "@nestjs/common";

import { EmployeeAuthModule } from "@auth/employees/employee-auth.module";
import { MemberAuthModule } from "@auth/members/member-auth.module";
import { SharedAuthModule } from "@auth/shared/shared-auth.module";

/**
 * Главный модуль аутентификации
 * Импортирует модули для аутентификации сотрудников и членов
 */
@Module({
    imports: [EmployeeAuthModule, MemberAuthModule, SharedAuthModule],
    exports: [EmployeeAuthModule, MemberAuthModule, SharedAuthModule],
})
export class AuthModule {}
