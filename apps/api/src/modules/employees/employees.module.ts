import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule, JwtModuleOptions } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { JWT_DEFAULTS, JWT_ENV_KEYS } from "@auth/domain/constants/jwt.constants";
import { EmployeeAuthController } from "@employees/api/controllers/employee-auth.controller";
import { EmployeeRegistrationController } from "@employees/api/controllers/employee-registration.controller";
import { EmployeeAuthService } from "@employees/application/services/employee-auth.service";
import { EmployeeRegistrationService } from "@employees/application/services/employee-registration.service";
import { EmployeesService } from "@employees/application/services/employees.service";
import { EmployeeRepository } from "@employees/domain/repositories/employee-repository.interface";
import { EmployeeTokenRepository } from "@employees/domain/repositories/employee-token-repository.interface";
import { AdminGuard } from "@employees/infrastructure/guards/admin.guard";
import { EmployeeJwtAuthGuard } from "@employees/infrastructure/guards/employee-jwt-auth.guard";
import { EmployeeLocalAuthGuard } from "@employees/infrastructure/guards/employee-local-auth.guard";
import { EmployeePrismaRepository } from "@employees/infrastructure/repositories/employee.repository";
import { EmployeeTokenPrismaRepository } from "@employees/infrastructure/repositories/employee-token.repository";
import { EmployeeJwtStrategy } from "@employees/infrastructure/strategies/employee-jwt.strategy";
import { EmployeeLocalStrategy } from "@employees/infrastructure/strategies/employee-local.strategy";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import { UserPrismaRepository } from "@users/infrastructure/repositories/user-prisma.repository";

import { PrismaModule } from "@common/prisma/prisma.module";

@Module({
    imports: [
        PrismaModule,
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
        EmployeesService,
        EmployeeAuthService,
        EmployeeRegistrationService,
        EmployeeLocalStrategy,
        EmployeeJwtStrategy,
        EmployeeJwtAuthGuard,
        EmployeeLocalAuthGuard,
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
        AdminGuard,
    ],
    controllers: [EmployeeAuthController, EmployeeRegistrationController],
    exports: [
        EmployeesService,
        EmployeeAuthService,
        EmployeeRegistrationService,
        EmployeeJwtAuthGuard,
        EmployeeLocalAuthGuard,
    ],
})
export class EmployeesModule {}
