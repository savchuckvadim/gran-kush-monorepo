import { Injectable } from "@nestjs/common";

import { UserAccountStatus } from "@prisma/client";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";

import { IdentityError } from "../../domain/identity-error";
import type { ExternalProfile } from "../../domain/identity-provider";
import {
    identityLinkOf,
    UserIdentityRepository,
} from "../../domain/repositories/user-identity-repository.interface";

/**
 * Привязать способ входа к аккаунту, который уже вошёл («Вход и безопасность»). Правила:
 * - аккаунт берётся из сессии (для редиректа — из подписанного state), не из ответа провайдера;
 * - адрес, который провайдер прислал, но не подтвердил, — отказ (`unverified`): такой профиль мог
 *   завести кто угодно;
 * - способ, привязанный к другому аккаунту, не перепривязывается: иначе вход через него молча
 *   сменил бы владельца (`taken`);
 * - у аккаунта один способ каждого провайдера: другой — сначала отвязать (`other_linked`);
 * - тот же способ повторно — без ошибки, профиль обновится;
 * - почта у провайдера может отличаться от почты аккаунта: вход дальше идёт по привязке.
 * Сессии не трогаются: привязка ничего не отнимает у владельца.
 */
@Injectable()
export class LinkIdentityUseCase {
    constructor(
        private readonly users: UserRepository,
        private readonly identities: UserIdentityRepository
    ) {}

    async execute(userId: string, profile: ExternalProfile): Promise<void> {
        if (profile.email && !profile.emailVerified) {
            throw new IdentityError("unverified", profile.provider);
        }
        const user = await this.users.findById(userId);
        if (!user || user.status === UserAccountStatus.blocked) {
            throw new IdentityError("account_gone");
        }

        const owner = await this.identities.findUserIdByProvider(profile.provider, profile.subject);
        if (owner && owner !== userId) throw new IdentityError("taken", profile.provider);

        const current = await this.identities.findForUser(userId, profile.provider);
        if (current && current.providerUserId !== profile.subject) {
            throw new IdentityError("other_linked", profile.provider);
        }
        await this.identities.link(identityLinkOf(userId, profile));
    }
}
