import { Injectable } from "@nestjs/common";

import { IdentityProvider, UserAccountStatus } from "@prisma/client";

import { UserIdentityRepository } from "@modules/portal/auth/social/domain/repositories/user-identity-repository.interface";
import type { GoogleProfile } from "@modules/portal/auth/social/domain/social-profile";
import { UserRepository } from "@modules/users/domain/repositories/user-repository.interface";

/** Почему привязка не прошла; уходит параметром `google` на страницу аккаунта. */
export type GoogleLinkFailure =
    | "google_unverified"
    | "google_taken"
    | "google_other_linked"
    | "account_gone";

export class GoogleLinkError extends Error {
    constructor(readonly reason: GoogleLinkFailure) {
        super(`Google link rejected: ${reason}`);
    }
}

/**
 * Привязать Google к аккаунту, который уже вошёл (TASK-716). Правила:
 * - аккаунт берётся из сессии на старте (подписанный state), не из ответа Google;
 * - Google-аккаунт, привязанный к другому аккаунту PafPaf, не перепривязывается: иначе вход через
 *   него молча сменил бы владельца (`google_taken`);
 * - у аккаунта один Google: другой — сначала отвязать (`google_other_linked`);
 * - тот же Google повторно — без ошибки, профиль обновится;
 * - почта Google может отличаться от почты аккаунта: вход дальше идёт по привязке, а не по адресу.
 * Сессии не трогаются: привязка ничего не отнимает у владельца.
 */
@Injectable()
export class LinkGoogleUseCase {
    constructor(
        private readonly users: UserRepository,
        private readonly identities: UserIdentityRepository
    ) {}

    async execute(userId: string, profile: GoogleProfile): Promise<void> {
        if (!profile.emailVerified) throw new GoogleLinkError("google_unverified");

        const user = await this.users.findById(userId);
        if (!user || user.status === UserAccountStatus.blocked) {
            throw new GoogleLinkError("account_gone");
        }

        const owner = await this.identities.findUserIdByProvider(
            IdentityProvider.google,
            profile.providerUserId
        );
        if (owner && owner !== userId) throw new GoogleLinkError("google_taken");

        const current = await this.identities.findForUser(userId, IdentityProvider.google);
        if (current && current.providerUserId !== profile.providerUserId) {
            throw new GoogleLinkError("google_other_linked");
        }

        await this.identities.link({
            userId,
            provider: IdentityProvider.google,
            providerUserId: profile.providerUserId,
            email: profile.email,
            emailVerified: profile.emailVerified,
            displayName: profile.displayName,
            givenName: profile.givenName,
            familyName: profile.familyName,
            locale: profile.locale,
        });
    }
}
