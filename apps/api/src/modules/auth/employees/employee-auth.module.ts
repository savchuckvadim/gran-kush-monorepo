import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule, JwtModuleOptions } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { JWT_DEFAULTS, JWT_ENV_KEYS } from "@auth/domain/constants/jwt.constants";
import { EmployeeAuthController } from "@auth/employees/api/controllers/employee-auth.controller";
import { EmployeeRegistrationController } from "@auth/employees/api/controllers/employee-registration.controller";
import { EmployeeAuthService } from "@auth/employees/application/services/employee-auth.service";
import { EmployeeRegistrationService } from "@auth/employees/application/services/employee-registration.service";
import { AdminGuard } from "@auth/employees/infrastructure/guards/admin.guard";
import { EmployeeJwtAuthGuard } from "@auth/employees/infrastructure/guards/employee-jwt-auth.guard";
import { EmployeeLocalAuthGuard } from "@auth/employees/infrastructure/guards/employee-local-auth.guard";
import { EmployeeJwtStrategy } from "@auth/employees/infrastructure/strategies/employee-jwt.strategy";
import { EmployeeLocalStrategy } from "@auth/employees/infrastructure/strategies/employee-local.strategy";
import { SharedAuthModule } from "@auth/shared/shared-auth.module";
import { EmployeesService } from "@employees/application/services/employees.service";
import { EmployeeRepository } from "@employees/domain/repositories/employee-repository.interface";
import { EmployeeTokenRepository } from "@employees/domain/repositories/employee-token-repository.interface";
import { EmployeePrismaRepository } from "@employees/infrastructure/repositories/employee.repository";
import { EmployeeTokenPrismaRepository } from "@employees/infrastructure/repositories/employee-token.repository";
import { MailModule } from "@mail/mail.module";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import { UserPrismaRepository } from "@users/infrastructure/repositories/user-prisma.repository";

import { PrismaModule } from "@common/prisma/prisma.module";

import { EmployeeRegistrationUseCase } from "./application/use-cases/employee-registration.use-case";

@Module({
    imports: [
        PrismaModule,
        MailModule,
        SharedAuthModule,
        PassportModule.register({ defaultStrategy: "employee-jwt" }),
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
        EmployeeJwtStrategy,
        EmployeeJwtAuthGuard,
        EmployeeLocalAuthGuard,
        AdminGuard,
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
    controllers: [EmployeeAuthController, EmployeeRegistrationController],
    exports: [
        EmployeeAuthService,
        EmployeeRegistrationService,
        EmployeeJwtAuthGuard,
        EmployeeLocalAuthGuard,
        AdminGuard,
    ],
})
export class EmployeeAuthModule {}
