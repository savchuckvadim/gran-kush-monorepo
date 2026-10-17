import { Module } from "@nestjs/common";

import { IdentityModule } from "@modules/portal/auth/identity/identity.module";
import { SharedAuthModule } from "@modules/portal/auth/shared/shared-auth.module";
import { AuthTokensModule } from "@modules/portal/auth/tokens/auth-tokens.module";
import { UsersModule } from "@modules/users/users.module";

import { AccountSecurityHttpService } from "./api/account-security-http.service";
import { CabinetAccountSecurityController } from "./api/controllers/cabinet-account-security.controller";
import { CrmAccountSecurityController } from "./api/controllers/crm-account-security.controller";
import { AccountSecurityService } from "./application/services/account-security.service";
import { ChangeAccountPasswordUseCase } from "./application/use-cases/change-account-password.use-case";
import { UnlinkProviderUseCase } from "./application/use-cases/unlink-provider.use-case";

/** «Вход и безопасность» в CRM и кабинете (TASK-716, TASK-738). */
@Module({
    imports: [UsersModule, SharedAuthModule, IdentityModule, AuthTokensModule],
    controllers: [CrmAccountSecurityController, CabinetAccountSecurityController],
    providers: [
        AccountSecurityService,
        AccountSecurityHttpService,
        ChangeAccountPasswordUseCase,
        UnlinkProviderUseCase,
    ],
})
export class AccountSecurityModule {}
