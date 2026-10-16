import { Module } from "@nestjs/common";

import { MemberAuthModule } from "@modules/portal/auth/members/member-auth.module";
import { SharedAuthModule } from "@modules/portal/auth/shared/shared-auth.module";
import { SocialAuthModule } from "@modules/portal/auth/social/social-auth.module";
import { UsersModule } from "@modules/users/users.module";

import { CabinetAccountSecurityController } from "./api/controllers/cabinet-account-security.controller";
import { AccountSecurityService } from "./application/services/account-security.service";
import { ChangeAccountPasswordUseCase } from "./application/use-cases/change-account-password.use-case";
import { UnlinkProviderUseCase } from "./application/use-cases/unlink-provider.use-case";

/**
 * Способы входа аккаунта (TASK-716). Отдельный модуль: настройки входа опираются на модули
 * авторизации и Google, а `AccountModule` им недоступен — его импортирует `MembersModule`.
 */
@Module({
    imports: [UsersModule, SharedAuthModule, MemberAuthModule, SocialAuthModule],
    controllers: [CabinetAccountSecurityController],
    providers: [AccountSecurityService, ChangeAccountPasswordUseCase, UnlinkProviderUseCase],
})
export class AccountSecurityModule {}
