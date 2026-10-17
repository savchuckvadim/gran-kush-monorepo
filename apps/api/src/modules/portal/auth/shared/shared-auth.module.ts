import { Module } from "@nestjs/common";

import { MailModule } from "@mail/mail.module";
import { UsersModule } from "@users/users.module";

import { MembershipGuard } from "@common/portal";
import { PrismaModule } from "@common/prisma/prisma.module";
import { EmailVerificationController } from "@modules/portal/auth/shared/api/controllers/email-verification.controller";
import { EmailVerificationService } from "@modules/portal/auth/shared/application/services/email-verification.service";
import { ClaimedMembershipRepository } from "@modules/portal/auth/shared/domain/repositories/claimed-membership-repository.interface";
import { ClaimedMembershipPrismaRepository } from "@modules/portal/auth/shared/infrastructure/repositories/claimed-membership.repository";
import { AuthTokensModule } from "@modules/portal/auth/tokens/auth-tokens.module";

@Module({
    imports: [UsersModule, MailModule, PrismaModule, AuthTokensModule],
    providers: [
        EmailVerificationService,
        MembershipGuard,
        {
            provide: ClaimedMembershipRepository,
            useClass: ClaimedMembershipPrismaRepository,
        },
    ],
    controllers: [EmailVerificationController],
    exports: [EmailVerificationService, MembershipGuard, ClaimedMembershipRepository],
})
export class SharedAuthModule {}
