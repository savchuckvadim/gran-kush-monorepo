import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule, JwtModuleOptions } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { MailModule } from "@mail/mail.module";
import { UsersModule } from "@users/users.module";

import { PrismaModule } from "@common/prisma/prisma.module";
import { JWT_DEFAULTS, JWT_ENV_KEYS } from "@modules/portal/auth/domain/constants/jwt.constants";
import { MemberAuthController } from "@modules/portal/auth/members/api/controllers/member-auth.controller";
import { MemberMobileAuthController } from "@modules/portal/auth/members/api/controllers/member-mobile-auth.controller";
import { MemberRegistrationController } from "@modules/portal/auth/members/api/controllers/member-registration.controller";
import { MemberAuthService } from "@modules/portal/auth/members/application/services/member-auth.service";
import { MemberRegistrationService } from "@modules/portal/auth/members/application/services/member-registration.service";
import { MemberJwtAuthGuard } from "@modules/portal/auth/members/infrastructure/guards/member-jwt-auth.guard";
import { MemberJwtMobileAuthGuard } from "@modules/portal/auth/members/infrastructure/guards/member-jwt-mobile-auth.guard";
import { MemberJwtBearerStrategy } from "@modules/portal/auth/members/infrastructure/strategies/member-jwt-bearer.strategy";
import { MemberJwtCookieStrategy } from "@modules/portal/auth/members/infrastructure/strategies/member-jwt-cookie.strategy";
import { SharedAuthModule } from "@modules/portal/auth/shared/shared-auth.module";
import { EntityFieldsModule } from "@modules/portal/crm/entity-fields/entity-fields.module";
import { MembersModule } from "@modules/portal/crm/members/members.module";

import { MemberRegistrationUseCase } from "./application/use-cases/member-registration.service";

@Module({
    imports: [
        PrismaModule,
        PassportModule,
        MailModule,
        SharedAuthModule,
        EntityFieldsModule,
        MembersModule,
        UsersModule,
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
        MemberRegistrationUseCase,
        MemberAuthService,
        MemberRegistrationService,
        MemberJwtCookieStrategy,
        MemberJwtBearerStrategy,
        MemberJwtAuthGuard,
        MemberJwtMobileAuthGuard,
    ],
    controllers: [MemberAuthController, MemberMobileAuthController, MemberRegistrationController],
    exports: [
        MemberAuthService,
        MemberRegistrationService,
        MemberJwtAuthGuard,
        MemberJwtMobileAuthGuard,
    ],
})
export class MemberAuthModule {}
