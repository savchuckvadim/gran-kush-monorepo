import { Injectable } from "@nestjs/common";

import { IdentityProvider, UserAccountStatus } from "@prisma/client";
import { User } from "@users/domain/entity/user.entity";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";

import { UserIdentityRepository } from "@modules/portal/auth/social/domain/repositories/user-identity-repository.interface";
import {
    parseTelegramProfile,
    type TelegramProfile,
} from "@modules/portal/auth/social/domain/telegram-auth";
import { TelegramAuthError } from "@modules/portal/auth/social/domain/telegram-auth-error";
import { telegramIdentity } from "@modules/portal/auth/social/domain/telegram-identity";

import { AuthTokensService } from "@modules/portal/auth/tokens/application/auth-tokens.service";
import { AUTH_TOKEN_PURPOSES } from "@modules/portal/auth/tokens/domain/auth-token";

import { SocialLoginService } from "../services/social-login.service";

/**
 * Ссылка из письма после входа через Telegram: адрес доказан. Правила:
 * - аккаунт с этой почтой есть — Telegram привязывается к нему, аккаунт заявляется так же, как
 *   при входе через Google (`SocialLoginService.claimAccount`): неподтверждённый активируется,
 *   чужой пароль неподтверждённого аккаунта сбрасывается;
 * - аккаунта нет — заводится новый, без пароля, с подтверждённой почтой;
 * - Telegram, который за это время привязали к другому аккаунту, не перепривязывается
 *   (`telegram_taken`);
 * - ссылка одноразовая: повтор или ссылка из более раннего письма — `telegram_link`.
 * Ожидающие членства ссылка не подтверждает — это делает владелец сам (TASK-703).
 */
@Injectable()
export class ConfirmTelegramEmailUseCase {
    constructor(
        private readonly authTokens: AuthTokensService,
        private readonly identities: UserIdentityRepository,
        private readonly users: UserRepository,
        private readonly socialLogin: SocialLoginService
    ) {}

    async execute(token: string): Promise<User> {
        const { profile, email } = await this.readLink(token);
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

    private async readLink(token: string): Promise<{ profile: TelegramProfile; email: string }> {
        const result = await this.authTokens.consume(AUTH_TOKEN_PURPOSES.IdentityEmailLink, token);
        if (result.kind !== "consumed" || !result.token.email) {
            throw new TelegramAuthError("telegram_link");
        }
        const payload = result.token.payload as { provider?: unknown; profile?: unknown } | null;
        const profile =
            payload?.provider === IdentityProvider.telegram
                ? parseTelegramProfile(payload.profile)
                : null;
        if (!profile) throw new TelegramAuthError("telegram_link");
        return { profile, email: result.token.email };
    }
}
