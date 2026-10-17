import { Module } from "@nestjs/common";

import { MailModule } from "@mail/mail.module";
import { UsersModule } from "@users/users.module";

import { MembershipGuard } from "@common/portal";
import { PrismaModule } from "@common/prisma/prisma.module";
import { RedisModule } from "@common/redis/redis.module";
import { EmailVerificationService } from "@modules/portal/auth/shared/application/services/email-verification.service";
import { PasswordSignInService } from "@modules/portal/auth/shared/application/services/password-sign-in.service";
import { ClaimedMembershipRepository } from "@modules/portal/auth/shared/domain/repositories/claimed-membership-repository.interface";
import { LoginFailureStore } from "@modules/portal/auth/shared/domain/repositories/login-failure-store.interface";
import { RedisLoginFailureStore } from "@modules/portal/auth/shared/infrastructure/redis-login-failure.store";
import { ClaimedMembershipPrismaRepository } from "@modules/portal/auth/shared/infrastructure/repositories/claimed-membership.repository";
import { AuthTokensModule } from "@modules/portal/auth/tokens/auth-tokens.module";

@Module({
    imports: [UsersModule, MailModule, PrismaModule, RedisModule, AuthTokensModule],
    providers: [
        EmailVerificationService,
        PasswordSignInService,
        { provide: LoginFailureStore, useClass: RedisLoginFailureStore },
        MembershipGuard,
        {
            provide: ClaimedMembershipRepository,
            useClass: ClaimedMembershipPrismaRepository,
        },
    ],
    exports: [
        EmailVerificationService,
        PasswordSignInService,
        MembershipGuard,
        ClaimedMembershipRepository,
    ],
})
export class SharedAuthModule {}
