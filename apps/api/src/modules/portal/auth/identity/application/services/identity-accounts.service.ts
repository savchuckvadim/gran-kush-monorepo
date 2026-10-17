import { Injectable } from "@nestjs/common";

import { UserAccountStatus } from "@prisma/client";
import { User } from "@users/domain/entity/user.entity";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";

import { SessionsService } from "@modules/portal/auth/sessions/application/sessions.service";
import { AuthTokensService } from "@modules/portal/auth/tokens/application/auth-tokens.service";
import { AUTH_TOKEN_PURPOSES } from "@modules/portal/auth/tokens/domain/auth-token";

import { IdentityError } from "../../domain/identity-error";
import type { ExternalProfile } from "../../domain/identity-provider";
import {
    identityLinkOf,
    UserIdentityRepository,
} from "../../domain/repositories/user-identity-repository.interface";

/**
 * Аккаунты для способов входа: найти по привязке, найти или завести по доказанной почте, заявить
 * аккаунт, когда владелец доказал адрес. Правила одни для всех провайдеров.
 */
@Injectable()
export class IdentityAccountsService {
    constructor(
        private readonly users: UserRepository,
        private readonly identities: UserIdentityRepository,
        private readonly sessions: SessionsService,
        private readonly authTokens: AuthTokensService
    ) {}

    /** Аккаунт, к которому привязан этот способ входа; `null` — не привязан. */
    async findLinked(profile: ExternalProfile): Promise<User | null> {
        const userId = await this.identities.findUserIdByProvider(
            profile.provider,
            profile.subject
        );
        return userId ? this.users.findById(userId) : null;
    }

    /**
     * Аккаунт для профиля с подтверждённой провайдером почтой: привязанный, найденный по email
     * (и заявленный этим входом) или новый — без пароля, с подтверждённой почтой. Способ входа
     * привязывается. Нужен везде, где провайдер доказывает адрес: вход, приём приглашения.
     */
    async findOrCreateByVerifiedEmail(profile: ExternalProfile): Promise<User> {
        if (!profile.email || !profile.emailVerified) {
            throw new IdentityError("unverified", profile.provider);
        }
        const existing =
            (await this.findLinked(profile)) ?? (await this.users.findByEmail(profile.email));
        const user = existing
            ? await this.claimAccount(existing)
            : await this.createConfirmed(profile.email, profile);
        await this.link(user.id, profile);
        return user;
    }

    /** Новый аккаунт без пароля: адрес уже доказан (провайдером или ссылкой из письма). */
    createConfirmed(email: string, profile: ExternalProfile): Promise<User> {
        const name =
            profile.displayName ||
            [profile.givenName, profile.familyName].filter(Boolean).join(" ") ||
            undefined;
        return this.users.create({
            email,
            passwordHash: null,
            status: UserAccountStatus.active,
            isActive: true,
            emailConfirmed: true,
            displayName: name,
        });
    }

    /**
     * Владелец только что доказал адрес аккаунта (провайдер или ссылка из письма): неподтверждённый
     * или ожидающий аккаунт активируется. Пароль неподтверждённого аккаунта мог задать не владелец
     * адреса (TASK-664) — он сбрасывается, сессии отзываются, ссылка подтверждения гасится.
     */
    async claimAccount(user: User): Promise<User> {
        if (user.status === UserAccountStatus.blocked) {
            throw new IdentityError("account_blocked");
        }
        const needsClaim =
            !user.emailConfirmed ||
            !user.isActive ||
            user.status === UserAccountStatus.pending_claim;
        if (!needsClaim) return user;

        const dropPassword = !user.emailConfirmed && user.passwordHash !== null;
        const claimed = await this.users.update(user.id, {
            status: UserAccountStatus.active,
            isActive: true,
            emailConfirmed: true,
            ...(dropPassword ? { passwordHash: null } : {}),
        });
        await this.authTokens.revokeForUser(claimed.id, [AUTH_TOKEN_PURPOSES.EmailVerification]);
        await this.sessions.endAllForUser(claimed.id, "account_claimed");
        return claimed;
    }

    /** Привязать (или обновить) способ входа: профиль и время последнего входа. */
    link(userId: string, profile: ExternalProfile): Promise<void> {
        return this.identities.link(identityLinkOf(userId, profile));
    }
}
