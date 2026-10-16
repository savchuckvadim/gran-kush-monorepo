import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { UsersModule } from "@users/users.module";

import { PrismaModule } from "@common/prisma/prisma.module";
import { EmployeeAuthModule } from "@modules/portal/auth/employees/employee-auth.module";
import { MemberAuthModule } from "@modules/portal/auth/members/member-auth.module";
import { SharedAuthModule } from "@modules/portal/auth/shared/shared-auth.module";
import { EmployeeGoogleAuthController } from "@modules/portal/auth/social/api/controllers/employee-google-auth.controller";
import { MemberGoogleAuthController } from "@modules/portal/auth/social/api/controllers/member-google-auth.controller";
import { EmployeeGoogleSignInService } from "@modules/portal/auth/social/application/services/employee-google-sign-in.service";
import { GoogleOAuthFlowService } from "@modules/portal/auth/social/application/services/google-oauth-flow.service";
import { SocialLoginService } from "@modules/portal/auth/social/application/services/social-login.service";
import { GoogleOAuthGateway } from "@modules/portal/auth/social/domain/google-oauth.gateway";
import { LinkGoogleUseCase } from "@modules/portal/auth/social/application/use-cases/link-google.use-case";
import { UserIdentityRepository } from "@modules/portal/auth/social/domain/repositories/user-identity-repository.interface";
import { GoogleOAuthClient } from "@modules/portal/auth/social/infrastructure/google/google-oauth.client";
import { UserIdentityPrismaRepository } from "@modules/portal/auth/social/infrastructure/repositories/user-identity.repository";
import { InvitationsModule } from "@modules/portal/crm/invitations/invitations.module";

@Module({
    imports: [
        UsersModule,
        PrismaModule,
        JwtModule,
        SharedAuthModule,
        MemberAuthModule,
        EmployeeAuthModule,
        InvitationsModule,
    ],
    providers: [
        SocialLoginService,
        LinkGoogleUseCase,
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
    controllers: [MemberGoogleAuthController, EmployeeGoogleAuthController],
    exports: [UserIdentityRepository],
})
export class SocialAuthModule {}
