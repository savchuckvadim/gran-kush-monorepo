import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { MailModule } from "@mail/mail.module";
import { UsersModule } from "@users/users.module";

import { CookieModule } from "@common/cookie";
import { PrismaModule } from "@common/prisma/prisma.module";
import { EmailVerificationController } from "@modules/portal/auth/shared/api/controllers/email-verification.controller";
import { EmailVerificationService } from "@modules/portal/auth/shared/application/services/email-verification.service";

@Module({
    imports: [UsersModule, MailModule, JwtModule, CookieModule, PrismaModule],
    providers: [EmailVerificationService],
    controllers: [EmailVerificationController],
    exports: [EmailVerificationService, CookieModule],
})
export class SharedAuthModule {}
