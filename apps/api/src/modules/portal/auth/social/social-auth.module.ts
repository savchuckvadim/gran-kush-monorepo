import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { UsersModule } from "@users/users.module";

import { PrismaModule } from "@common/prisma/prisma.module";
import { MailModule } from "@modules/mail/mail.module";
import { SharedAuthModule } from "@modules/portal/auth/shared/shared-auth.module";
import { EmployeeGoogleAuthController } from "@modules/portal/auth/social/api/controllers/employee-google-auth.controller";
import { MemberGoogleAuthController } from "@modules/portal/auth/social/api/controllers/member-google-auth.controller";
import { MemberTelegramAuthController } from "@modules/portal/auth/social/api/controllers/member-telegram-auth.controller";
import { EmployeeGoogleSignInService } from "@modules/portal/auth/social/application/services/employee-google-sign-in.service";
import { GoogleOAuthFlowService } from "@modules/portal/auth/social/application/services/google-oauth-flow.service";
import { SocialLoginService } from "@modules/portal/auth/social/application/services/social-login.service";
import { TelegramLoginService } from "@modules/portal/auth/social/application/services/telegram-login.service";
import { ConfirmTelegramEmailUseCase } from "@modules/portal/auth/social/application/use-cases/confirm-telegram-email.use-case";
import { LinkGoogleUseCase } from "@modules/portal/auth/social/application/use-cases/link-google.use-case";
import { LinkTelegramUseCase } from "@modules/portal/auth/social/application/use-cases/link-telegram.use-case";
import { RequestTelegramEmailUseCase } from "@modules/portal/auth/social/application/use-cases/request-telegram-email.use-case";
import { SignInWithTelegramUseCase } from "@modules/portal/auth/social/application/use-cases/sign-in-with-telegram.use-case";
import { GoogleOAuthGateway } from "@modules/portal/auth/social/domain/google-oauth.gateway";
import { UserIdentityRepository } from "@modules/portal/auth/social/domain/repositories/user-identity-repository.interface";
import { GoogleOAuthClient } from "@modules/portal/auth/social/infrastructure/google/google-oauth.client";
import { UserIdentityPrismaRepository } from "@modules/portal/auth/social/infrastructure/repositories/user-identity.repository";
import { AuthTokensModule } from "@modules/portal/auth/tokens/auth-tokens.module";
import { InvitationsModule } from "@modules/portal/crm/invitations/invitations.module";

@Module({
    imports: [
        UsersModule,
        PrismaModule,
        JwtModule,
        SharedAuthModule,
        AuthTokensModule,
        InvitationsModule,
        MailModule,
    ],
    providers: [
        SocialLoginService,
        LinkGoogleUseCase,
        TelegramLoginService,
        SignInWithTelegramUseCase,
        RequestTelegramEmailUseCase,
        ConfirmTelegramEmailUseCase,
        LinkTelegramUseCase,
        GoogleOAuthFlowService,
        EmployeeGoogleSignInService,
        {
            provide: GoogleOAuthGateway,
            useClass: GoogleOAuthClient,
        },
        {
            provide: UserIdentityRepository,
            useClass: UserIdentityPrismaRepository,
        },
    ],
    controllers: [
        MemberGoogleAuthController,
        EmployeeGoogleAuthController,
        MemberTelegramAuthController,
    ],
    exports: [UserIdentityRepository, LinkTelegramUseCase],
})
export class SocialAuthModule {}
