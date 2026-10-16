import { Injectable, NotFoundException } from "@nestjs/common";

import { IdentityProvider } from "@prisma/client";

import { RefreshTokenRepository } from "@modules/portal/auth/shared/domain/repositories/refresh-token-repository.interface";
import { UserIdentityRepository } from "@modules/portal/auth/social/domain/repositories/user-identity-repository.interface";
import { UserRepository } from "@modules/users/domain/repositories/user-repository.interface";

export interface AccountSecurity {
    email: string;
    hasPassword: boolean;
    google: { linked: boolean; email: string | null };
}

/** Способы входа аккаунта и выход со всех устройств. */
@Injectable()
export class AccountSecurityService {
    constructor(
        private readonly users: UserRepository,
        private readonly identities: UserIdentityRepository,
        private readonly refreshTokens: RefreshTokenRepository
    ) {}

    async overview(userId: string): Promise<AccountSecurity> {
        const user = await this.users.findById(userId);
        if (!user) throw new NotFoundException("Account not found");
        const google = await this.identities.findForUser(userId, IdentityProvider.google);
        return {
            email: user.email,
            hasPassword: user.passwordHash !== null,
            google: { linked: google !== null, email: google?.email ?? null },
        };
    }

    /**
     * Снять все сессии аккаунта — кабинета и CRM, на всех устройствах: аккаунт и пароль у них
     * общие. Access-токены живут до 15 минут, refresh после этого не обновится.
     */
    async signOutEverywhere(userId: string): Promise<void> {
        await this.refreshTokens.revokeAllForUser(userId);
    }
}
