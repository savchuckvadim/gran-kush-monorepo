import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { UsersModule } from "@users/users.module";

import { PrismaModule } from "@common/prisma/prisma.module";
import { MailModule } from "@modules/mail/mail.module";
import { SharedAuthModule } from "@modules/portal/auth/shared/shared-auth.module";
import { AuthTokensModule } from "@modules/portal/auth/tokens/auth-tokens.module";
import { InvitationsModule } from "@modules/portal/crm/invitations/invitations.module";

import { CabinetIdentityAuthController } from "./api/controllers/cabinet-identity-auth.controller";
import { CrmIdentityAuthController } from "./api/controllers/crm-identity-auth.controller";
import { IdentityHttpService } from "./api/identity-http.service";
import {
    IDENTITY_PROVIDERS,
    IdentityProviderRegistry,
} from "./application/identity-provider.registry";
import { CabinetIdentitySignInService } from "./application/services/cabinet-identity-sign-in.service";
import { CrmIdentitySignInService } from "./application/services/crm-identity-sign-in.service";
import { IdentityAccountsService } from "./application/services/identity-accounts.service";
import { IdentityTicketService } from "./application/services/identity-ticket.service";
import { LinkFromRedirectService } from "./application/services/link-from-redirect.service";
import { OAuthRedirectFlowService } from "./application/services/oauth-redirect-flow.service";
import { ConfirmIdentityEmailUseCase } from "./application/use-cases/confirm-identity-email.use-case";
import { LinkIdentityUseCase } from "./application/use-cases/link-identity.use-case";
import { RequestIdentityEmailUseCase } from "./application/use-cases/request-identity-email.use-case";
import { SignInWithIdentityUseCase } from "./application/use-cases/sign-in-with-identity.use-case";
import { GoogleOAuthGateway } from "./domain/google-oauth.gateway";
import { UserIdentityRepository } from "./domain/repositories/user-identity-repository.interface";
import { GoogleIdentityProvider } from "./infrastructure/google/google.identity-provider";
import { GoogleOAuthClient } from "./infrastructure/google/google-oauth.client";
import { UserIdentityPrismaRepository } from "./infrastructure/repositories/user-identity.repository";
import { TelegramIdentityProvider } from "./infrastructure/telegram/telegram.identity-provider";

/**
 * Способы входа через провайдеров (TASK-737, AUTH_ARCHITECTURE §6). Новый провайдер — адаптер в
 * `infrastructure/` и строка в `IDENTITY_PROVIDERS`; маршруты, сценарии и сессии общие.
 */
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
        GoogleIdentityProvider,
        TelegramIdentityProvider,
        {
            provide: IDENTITY_PROVIDERS,
            useFactory: (google: GoogleIdentityProvider, telegram: TelegramIdentityProvider) => [
                google,
                telegram,
            ],
            inject: [GoogleIdentityProvider, TelegramIdentityProvider],
        },
        IdentityProviderRegistry,
        OAuthRedirectFlowService,
        IdentityAccountsService,
        IdentityTicketService,
        SignInWithIdentityUseCase,
        RequestIdentityEmailUseCase,
        ConfirmIdentityEmailUseCase,
        LinkIdentityUseCase,
        LinkFromRedirectService,
        CabinetIdentitySignInService,
        CrmIdentitySignInService,
        IdentityHttpService,
        { provide: GoogleOAuthGateway, useClass: GoogleOAuthClient },
        { provide: UserIdentityRepository, useClass: UserIdentityPrismaRepository },
    ],
    controllers: [CrmIdentityAuthController, CabinetIdentityAuthController],
    exports: [UserIdentityRepository, IdentityProviderRegistry, LinkIdentityUseCase],
})
export class IdentityModule {}
