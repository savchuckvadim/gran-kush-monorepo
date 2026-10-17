import { Module } from "@nestjs/common";

import { UsersModule } from "@users/users.module";

import { PrismaModule } from "@common/prisma/prisma.module";
import { EmployeeAuthController } from "@modules/portal/auth/employees/api/controllers/employee-auth.controller";
import { EmployeeMobileAuthController } from "@modules/portal/auth/employees/api/controllers/employee-mobile-auth.controller";
import { EmployeeAuthService } from "@modules/portal/auth/employees/application/services/employee-auth.service";
import { SharedAuthModule } from "@modules/portal/auth/shared/shared-auth.module";

/** Вход в CRM паролем (веб и натив). Сессии — `SessionsModule`. */
@Module({
    imports: [PrismaModule, SharedAuthModule, UsersModule],
    providers: [EmployeeAuthService],
    controllers: [EmployeeAuthController, EmployeeMobileAuthController],
    exports: [EmployeeAuthService],
})
export class EmployeeAuthModule {}
