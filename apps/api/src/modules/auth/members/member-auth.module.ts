import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule, JwtModuleOptions } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { JWT_DEFAULTS, JWT_ENV_KEYS } from "@auth/domain/constants/jwt.constants";
import { MemberAuthController } from "@auth/members/api/controllers/member-auth.controller";
import { MemberRegistrationController } from "@auth/members/api/controllers/member-registration.controller";
import { MemberAuthService } from "@auth/members/application/services/member-auth.service";
import { MemberRegistrationService } from "@auth/members/application/services/member-registration.service";
import { MemberJwtAuthGuard } from "@auth/members/infrastructure/guards/member-jwt-auth.guard";
import { MemberLocalAuthGuard } from "@auth/members/infrastructure/guards/member-local-auth.guard";
import { MemberJwtStrategy } from "@auth/members/infrastructure/strategies/member-jwt.strategy";
import { MemberLocalStrategy } from "@auth/members/infrastructure/strategies/member-local.strategy";
import { SharedAuthModule } from "@auth/shared/shared-auth.module";
import { MailModule } from "@mail/mail.module";
import { TokenRepository } from "@members/domain/repositories/token-repository.interface";
import { TokenPrismaRepository } from "@members/infrastructure/repositories/token.repository";
import { MembersModule } from "@members/members.module";
import { UsersModule } from "@users/users.module";

import { PrismaModule } from "@common/prisma/prisma.module";

import { MemberRegistrationUseCase } from "./application/use-cases/member-registration.service";

@Module({
    imports: [
        PrismaModule,
        PassportModule,
        MailModule,
        SharedAuthModule,
        MembersModule, // Импортируем MembersModule для доступа к MembersService и MemberRepository
        UsersModule, // Импортируем UsersModule для доступа к UserRepository
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
        MemberLocalStrategy,
        MemberJwtStrategy,
        MemberJwtAuthGuard,
        MemberLocalAuthGuard,
        {
            provide: TokenRepository,
            useClass: TokenPrismaRepository,
        },
    ],
    controllers: [MemberAuthController, MemberRegistrationController],
    exports: [
        MemberAuthService,
        MemberRegistrationService,
        MemberJwtAuthGuard,
        MemberLocalAuthGuard,
    ],
})
export class MemberAuthModule {}
