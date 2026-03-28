import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { EmailVerificationController } from "@auth/shared/api/controllers/email-verification.controller";
import { EmailVerificationService } from "@auth/shared/application/services/email-verification.service";
import { MailModule } from "@mail/mail.module";
import { UsersModule } from "@users/users.module";

import { CookieModule } from "@common/cookie";

@Module({
    imports: [UsersModule, MailModule, JwtModule, CookieModule],
    providers: [EmailVerificationService],
    controllers: [EmailVerificationController],
    exports: [EmailVerificationService, CookieModule],
})
export class SharedAuthModule {}
