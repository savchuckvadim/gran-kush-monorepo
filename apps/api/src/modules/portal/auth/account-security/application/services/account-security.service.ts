import { Injectable, NotFoundException } from "@nestjs/common";

import { IdentityProvider } from "@prisma/client";

import { SessionsService } from "@modules/portal/auth/sessions/application/sessions.service";
import {
    type LinkedIdentity,
    UserIdentityRepository,
} from "@modules/portal/auth/social/domain/repositories/user-identity-repository.interface";
import { UserRepository } from "@modules/users/domain/repositories/user-repository.interface";

export interface AccountSecurity {
    email: string;
    hasPassword: boolean;
    google: { linked: boolean; email: string | null };
    telegram: { linked: boolean; username: string | null };
}

/** Способы входа аккаунта: пароль и привязанные провайдеры. */
export interface SignInMethods {
    hasPassword: boolean;
    google: LinkedIdentity | null;
    telegram: LinkedIdentity | null;
}

/** Способы входа аккаунта и выход со всех устройств. */
@Injectable()
export class AccountSecurityService {
    constructor(
        private readonly users: UserRepository,
        private readonly identities: UserIdentityRepository,
        private readonly sessions: SessionsService
    ) {}

    async signInMethods(userId: string): Promise<{ email: string } & SignInMethods> {
        const user = await this.users.findById(userId);
        if (!user) throw new NotFoundException("Account not found");
        const [google, telegram] = await Promise.all([
            this.identities.findForUser(userId, IdentityProvider.google),
            this.identities.findForUser(userId, IdentityProvider.telegram),
        ]);
        return { email: user.email, hasPassword: user.passwordHash !== null, google, telegram };
    }

    async overview(userId: string): Promise<AccountSecurity> {
        const methods = await this.signInMethods(userId);
        return {
            email: methods.email,
            hasPassword: methods.hasPassword,
            google: { linked: methods.google !== null, email: methods.google?.email ?? null },
            telegram: {
                linked: methods.telegram !== null,
                username: methods.telegram?.username ?? null,
            },
        };
    }

    /**
     * Снять все сессии аккаунта — кабинета и CRM, на всех устройствах: аккаунт и пароль у них
     * общие. Отзыв действует сразу: гвард проверяет сессию на каждый запрос.
     */
    async signOutEverywhere(userId: string): Promise<void> {
        await this.sessions.endAllForUser(userId, "sign_out_everywhere");
    }
}
