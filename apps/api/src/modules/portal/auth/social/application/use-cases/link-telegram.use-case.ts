import { Injectable } from "@nestjs/common";

import { IdentityProvider } from "@prisma/client";

import { UserIdentityRepository } from "@modules/portal/auth/social/domain/repositories/user-identity-repository.interface";
import type { TelegramAuthData } from "@modules/portal/auth/social/domain/telegram-auth";
import { TelegramAuthError } from "@modules/portal/auth/social/domain/telegram-auth-error";
import { telegramIdentity } from "@modules/portal/auth/social/domain/telegram-identity";

import { TelegramLoginService } from "../services/telegram-login.service";

/**
 * Привязать Telegram к аккаунту, который уже вошёл («Вход и безопасность»). Те же правила, что у
 * Google: чужой Telegram не перепривязывается (`telegram_taken`), второй — только после отвязки
 * первого (`telegram_other_linked`), тот же повторно — без ошибки. Почта не нужна: она уже есть.
 */
@Injectable()
export class LinkTelegramUseCase {
    constructor(
        private readonly telegram: TelegramLoginService,
        private readonly identities: UserIdentityRepository
    ) {}

    async execute(userId: string, data: TelegramAuthData): Promise<void> {
        const profile = this.telegram.verify(data);
        const owner = await this.identities.findUserIdByProvider(
            IdentityProvider.telegram,
            profile.telegramId
        );
        if (owner && owner !== userId) throw new TelegramAuthError("telegram_taken");

        const current = await this.identities.findForUser(userId, IdentityProvider.telegram);
        if (current && current.providerUserId !== profile.telegramId) {
            throw new TelegramAuthError("telegram_other_linked");
        }
        await this.identities.link(telegramIdentity(userId, profile));
    }
}
