import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { EmailVerificationController } from "@auth/shared/api/controllers/email-verification.controller";
import { AuthCookieService } from "@auth/shared/application/services/auth-cookie.service";
import { AuthSessionService } from "@auth/shared/application/services/auth-session.service";
import { EmailVerificationService } from "@auth/shared/application/services/email-verification.service";
import { MailModule } from "@mail/mail.module";
import { UsersModule } from "@users/users.module";

import { PrismaModule } from "@common/prisma/prisma.module";

@Module({
    imports: [UsersModule, MailModule, JwtModule, PrismaModule],
    providers: [EmailVerificationService, AuthCookieService, AuthSessionService],
    controllers: [EmailVerificationController],
    exports: [EmailVerificationService, AuthCookieService, AuthSessionService],
})
export class SharedAuthModule {}
