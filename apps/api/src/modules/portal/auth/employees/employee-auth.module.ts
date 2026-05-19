import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule, JwtModuleOptions } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { MailModule } from "@mail/mail.module";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import { UserPrismaRepository } from "@users/infrastructure/repositories/user-prisma.repository";

import { PASSPORT_JWT_STRATEGY } from "@common/auth";
import { PortalCrmSubscriptionGuard } from "@common/guards/portal-crm-subscription.guard";
import { PrismaModule } from "@common/prisma/prisma.module";
import { JWT_DEFAULTS, JWT_ENV_KEYS } from "@modules/portal/auth/domain/constants/jwt.constants";
import { EmployeeAuthController } from "@modules/portal/auth/employees/api/controllers/employee-auth.controller";
import { EmployeeMobileAuthController } from "@modules/portal/auth/employees/api/controllers/employee-mobile-auth.controller";
import { EmployeeRegistrationController } from "@modules/portal/auth/employees/api/controllers/employee-registration.controller";
import { EmployeeAuthService } from "@modules/portal/auth/employees/application/services/employee-auth.service";
import { EmployeeRegistrationService } from "@modules/portal/auth/employees/application/services/employee-registration.service";
import { AdminGuard } from "@modules/portal/auth/employees/infrastructure/guards/admin.guard";
import { EmployeeJwtAuthGuard } from "@modules/portal/auth/employees/infrastructure/guards/employee-jwt-auth.guard";
import { EmployeeJwtMobileAuthGuard } from "@modules/portal/auth/employees/infrastructure/guards/employee-jwt-mobile-auth.guard";
import { EmployeeLocalAuthGuard } from "@modules/portal/auth/employees/infrastructure/guards/employee-local-auth.guard";
import { EmployeeJwtBearerStrategy } from "@modules/portal/auth/employees/infrastructure/strategies/employee-jwt-bearer.strategy";
import { EmployeeJwtCookieStrategy } from "@modules/portal/auth/employees/infrastructure/strategies/employee-jwt-cookie.strategy";
import { EmployeeLocalStrategy } from "@modules/portal/auth/employees/infrastructure/strategies/employee-local.strategy";
import { SharedAuthModule } from "@modules/portal/auth/shared/shared-auth.module";
import { EmployeesService } from "@modules/portal/crm/employees/application/services/employees.service";
import { EmployeeRepository } from "@modules/portal/crm/employees/domain/repositories/employee-repository.interface";
import { EmployeeTokenRepository } from "@modules/portal/crm/employees/domain/repositories/employee-token-repository.interface";
import { EmployeePrismaRepository } from "@modules/portal/crm/employees/infrastructure/repositories/employee.repository";
import { EmployeeTokenPrismaRepository } from "@modules/portal/crm/employees/infrastructure/repositories/employee-token.repository";

import { EmployeeRegistrationUseCase } from "./application/use-cases/employee-registration.use-case";

@Module({
    imports: [
        PrismaModule,
        MailModule,
        SharedAuthModule,
        PassportModule.register({ defaultStrategy: PASSPORT_JWT_STRATEGY.EMPLOYEE_COOKIE }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService): JwtModuleOptions => {
                const expiresIn =
                    configService.get<string>(JWT_ENV_KEYS.ACCESS_TOKEN_EXPIRES_IN) ||
                    JWT_DEFAULTS.ACCESS_TOKEN_EXPIRES_IN;
                return {
                    secret: configService.get<string>(JWT_ENV_KEYS.SECRET) || JWT_DEFAULTS.SECRET,
                    signOptions: {
                        expiresIn: expiresIn as unknown as number | undefined,
                    },
                };
            },
        }),
    ],
    providers: [
        EmployeeRegistrationUseCase,
        EmployeeAuthService,
        EmployeeRegistrationService,
        EmployeeLocalStrategy,
        EmployeeJwtCookieStrategy,
        EmployeeJwtBearerStrategy,
        EmployeeJwtAuthGuard,
        EmployeeJwtMobileAuthGuard,
        EmployeeLocalAuthGuard,
        AdminGuard,
        PortalCrmSubscriptionGuard,
        EmployeesService, // Нужен для валидации
        {
            provide: EmployeeRepository,
            useClass: EmployeePrismaRepository,
        },
        {
            provide: EmployeeTokenRepository,
            useClass: EmployeeTokenPrismaRepository,
        },
        {
            provide: UserRepository,
            useClass: UserPrismaRepository,
        },
    ],
    controllers: [
        EmployeeAuthController,
        EmployeeMobileAuthController,
        EmployeeRegistrationController,
    ],
    exports: [
        EmployeeAuthService,
        EmployeeRegistrationService,
        EmployeeJwtAuthGuard,
        EmployeeJwtMobileAuthGuard,
        EmployeeLocalAuthGuard,
        AdminGuard,
    ],
})
export class EmployeeAuthModule {}
