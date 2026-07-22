import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { MailModule } from "@mail/mail.module";
import { UsersModule } from "@users/users.module";

import { CookieModule } from "@common/cookie";
import { MembershipGuard } from "@common/portal";
import { PrismaModule } from "@common/prisma/prisma.module";
import { EmailVerificationController } from "@modules/portal/auth/shared/api/controllers/email-verification.controller";
import { EmailVerificationService } from "@modules/portal/auth/shared/application/services/email-verification.service";
import { TokenIssuerService } from "@modules/portal/auth/shared/application/services/token-issuer.service";
import { RefreshTokenRepository } from "@modules/portal/auth/shared/domain/repositories/refresh-token-repository.interface";
import { RefreshTokenPrismaRepository } from "@modules/portal/auth/shared/infrastructure/repositories/refresh-token.repository";

@Module({
    imports: [UsersModule, MailModule, JwtModule, CookieModule, PrismaModule],
    providers: [
        EmailVerificationService,
        TokenIssuerService,
        MembershipGuard,
        {
            provide: RefreshTokenRepository,
            useClass: RefreshTokenPrismaRepository,
        },
    ],
    controllers: [EmailVerificationController],
    exports: [
        EmailVerificationService,
        TokenIssuerService,
        MembershipGuard,
        RefreshTokenRepository,
        CookieModule,
    ],
})
export class SharedAuthModule {}
