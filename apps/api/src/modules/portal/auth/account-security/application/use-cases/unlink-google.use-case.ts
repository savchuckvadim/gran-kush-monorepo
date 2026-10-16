import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";

import { IdentityProvider } from "@prisma/client";

import { UserIdentityRepository } from "@modules/portal/auth/social/domain/repositories/user-identity-repository.interface";
import { UserRepository } from "@modules/users/domain/repositories/user-repository.interface";

import { ACCOUNT_SECURITY_ERRORS } from "../../domain/account-security-errors";

/**
 * Отвязать Google от аккаунта (TASK-716). Без пароля Google — единственный способ войти: отвязка
 * заперла бы владельца снаружи, поэтому сначала пароль (`password_required`). Сессии не
 * отзываются: владелец сам убирает способ входа, а не теряет доступ.
 */
@Injectable()
export class UnlinkGoogleUseCase {
    constructor(
        private readonly users: UserRepository,
        private readonly identities: UserIdentityRepository
    ) {}

    async execute(userId: string): Promise<void> {
        const user = await this.users.findById(userId);
        if (!user) throw new NotFoundException("Account not found");

        const google = await this.identities.findForUser(userId, IdentityProvider.google);
        if (!google) {
            throw new NotFoundException({
                message: "Google is not linked",
                code: ACCOUNT_SECURITY_ERRORS.googleNotLinked,
            });
        }
        if (user.passwordHash === null) {
            throw new ConflictException({
                message: "Set a password before unlinking Google",
                code: ACCOUNT_SECURITY_ERRORS.passwordRequired,
            });
        }
        await this.identities.unlink(userId, IdentityProvider.google);
    }
}
