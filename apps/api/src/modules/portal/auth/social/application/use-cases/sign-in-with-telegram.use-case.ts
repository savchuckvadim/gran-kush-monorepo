import { Injectable } from "@nestjs/common";

import { IdentityProvider, UserAccountStatus } from "@prisma/client";
import { User } from "@users/domain/entity/user.entity";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";

import { UserIdentityRepository } from "@modules/portal/auth/social/domain/repositories/user-identity-repository.interface";
import type { TelegramAuthData } from "@modules/portal/auth/social/domain/telegram-auth";
import { TelegramAuthError } from "@modules/portal/auth/social/domain/telegram-auth-error";
import { telegramIdentity } from "@modules/portal/auth/social/domain/telegram-identity";

import { TelegramLoginService } from "../services/telegram-login.service";

export type TelegramSignIn =
    | { kind: "signed_in"; user: User }
    | { kind: "email_required"; ticket: string };

/**
 * Вход в кабинет через Telegram (вариант с почтой). Правила:
 * - подпись виджета проверяется ключом бота, ответ старше часа не принимается;
 * - Telegram уже привязан к аккаунту — вход сразу, профиль привязки обновляется;
 * - не привязан — входа нет: выдаётся билет на шаг «укажите почту». Аккаунт появится или
 *   найдётся только после ссылки из письма (`ConfirmTelegramEmailUseCase`): так в аккаунт
 *   с чужой почтой не войти, а у каждого аккаунта есть адрес для писем клубов.
 */
@Injectable()
export class SignInWithTelegramUseCase {
    constructor(
        private readonly telegram: TelegramLoginService,
        private readonly identities: UserIdentityRepository,
        private readonly users: UserRepository
    ) {}

    async execute(data: TelegramAuthData): Promise<TelegramSignIn> {
        const profile = this.telegram.verify(data);
        const userId = await this.identities.findUserIdByProvider(
            IdentityProvider.telegram,
            profile.telegramId
        );
        const user = userId ? await this.users.findById(userId) : null;
        if (!user) {
            return { kind: "email_required", ticket: this.telegram.issueSignUpTicket(profile) };
        }
        if (user.status === UserAccountStatus.blocked) {
            throw new TelegramAuthError("account_blocked");
        }
        await this.identities.link(telegramIdentity(user.id, profile));
        return { kind: "signed_in", user };
    }
}
