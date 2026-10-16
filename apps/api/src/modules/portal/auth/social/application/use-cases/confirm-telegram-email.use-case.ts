import { Injectable } from "@nestjs/common";

import { IdentityProvider, UserAccountStatus } from "@prisma/client";
import { User } from "@users/domain/entity/user.entity";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";

import { UserIdentityRepository } from "@modules/portal/auth/social/domain/repositories/user-identity-repository.interface";
import { TelegramAuthError } from "@modules/portal/auth/social/domain/telegram-auth-error";
import { telegramIdentity } from "@modules/portal/auth/social/domain/telegram-identity";

import { SocialLoginService } from "../services/social-login.service";
import { TelegramLoginService } from "../services/telegram-login.service";

/**
 * Ссылка из письма после входа через Telegram: адрес доказан. Правила:
 * - аккаунт с этой почтой есть — Telegram привязывается к нему, аккаунт заявляется так же, как
 *   при входе через Google (`SocialLoginService.claimAccount`): неподтверждённый активируется,
 *   чужой пароль неподтверждённого аккаунта сбрасывается;
 * - аккаунта нет — заводится новый, без пароля, с подтверждённой почтой;
 * - Telegram, который за это время привязали к другому аккаунту, не перепривязывается
 *   (`telegram_taken`); повтор той же ссылки для того же аккаунта ничего не ломает.
 * Ожидающие членства ссылка не подтверждает — это делает владелец сам (TASK-703).
 */
@Injectable()
export class ConfirmTelegramEmailUseCase {
    constructor(
        private readonly telegram: TelegramLoginService,
        private readonly identities: UserIdentityRepository,
        private readonly users: UserRepository,
        private readonly socialLogin: SocialLoginService
    ) {}

    async execute(token: string): Promise<User> {
        const { profile, email } = this.telegram.readEmailLink(token);
        const existing = await this.users.findByEmail(email);
        const owner = await this.identities.findUserIdByProvider(
            IdentityProvider.telegram,
            profile.telegramId
        );
        if (owner && owner !== existing?.id) throw new TelegramAuthError("telegram_taken");
        if (existing?.status === UserAccountStatus.blocked) {
            throw new TelegramAuthError("account_blocked");
        }

        const user = existing
            ? await this.socialLogin.claimAccount(existing)
            : await this.users.create({
                  email,
                  passwordHash: null,
                  status: UserAccountStatus.active,
                  isActive: true,
                  emailConfirmed: true,
                  displayName: [profile.firstName, profile.lastName].filter(Boolean).join(" "),
              });
        await this.identities.link(telegramIdentity(user.id, profile));
        return user;
    }
}
