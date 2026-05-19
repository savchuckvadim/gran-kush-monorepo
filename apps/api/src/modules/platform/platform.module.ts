import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule, JwtModuleOptions } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { PrismaModule } from "@common/prisma/prisma.module";
import { JWT_DEFAULTS, JWT_ENV_KEYS } from "@modules/portal/auth/domain/constants/jwt.constants";

import { PlatformPortalsController } from "./api/controllers/platform-portals.controller";
import { PlatformReferenceDataController } from "./api/controllers/platform-reference-data.controller";
import { PlatformAuthController } from "./auth/api/controllers/platform-auth.controller";
import { PlatformAuthService } from "./auth/application/services/platform-auth.service";
import { PlatformJwtAuthGuard } from "./auth/infrastructure/guards/platform-jwt-auth.guard";
import { PlatformJwtStrategy } from "./auth/infrastructure/strategies/platform-jwt.strategy";

@Module({
    imports: [
        PrismaModule,
        PassportModule.register({}),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService): JwtModuleOptions => {
                const secret =
                    configService.get<string>(JWT_ENV_KEYS.PLATFORM_SECRET) ||
                    `${configService.get<string>(JWT_ENV_KEYS.SECRET) || JWT_DEFAULTS.SECRET}:platform`;
                const expiresIn =
                    configService.get<string>(JWT_ENV_KEYS.PLATFORM_ACCESS_EXPIRES_IN) ||
                    JWT_DEFAULTS.PLATFORM_ACCESS_EXPIRES_IN;
                return {
                    secret,
                    signOptions: {
                        expiresIn: expiresIn as unknown as number,
                    },
                };
            },
        }),
    ],
    controllers: [
        PlatformAuthController,
        PlatformPortalsController,
        PlatformReferenceDataController,
    ],
    providers: [PlatformAuthService, PlatformJwtStrategy, PlatformJwtAuthGuard],
    exports: [PlatformAuthService, PlatformJwtAuthGuard],
})
export class PlatformModule {}
