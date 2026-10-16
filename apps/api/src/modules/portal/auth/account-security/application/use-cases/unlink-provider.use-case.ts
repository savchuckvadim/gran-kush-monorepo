import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";

import { IdentityProvider } from "@prisma/client";

import { UserIdentityRepository } from "@modules/portal/auth/social/domain/repositories/user-identity-repository.interface";

import { ACCOUNT_SECURITY_ERRORS } from "../../domain/account-security-errors";
import { AccountSecurityService } from "../services/account-security.service";

export type UnlinkableProvider = "google" | "telegram";

const NOT_LINKED: Record<UnlinkableProvider, string> = {
    google: ACCOUNT_SECURITY_ERRORS.googleNotLinked,
    telegram: ACCOUNT_SECURITY_ERRORS.telegramNotLinked,
};

/**
 * Отвязать Google или Telegram (TASK-716). Последний способ входа не снимается: без пароля и
 * другого провайдера войти было бы нечем (`last_sign_in_method`) — сначала задать пароль или
 * привязать второй. Сессии не отзываются: владелец убирает способ входа, а не теряет доступ.
 */
@Injectable()
export class UnlinkProviderUseCase {
    constructor(
        private readonly security: AccountSecurityService,
        private readonly identities: UserIdentityRepository
    ) {}

    async execute(userId: string, provider: UnlinkableProvider): Promise<void> {
        const methods = await this.security.signInMethods(userId);
        if (!methods[provider]) {
            throw new NotFoundException({
                message: `${provider} is not linked`,
                code: NOT_LINKED[provider],
            });
        }
        const other = provider === "google" ? methods.telegram : methods.google;
        if (!methods.hasPassword && !other) {
            throw new ConflictException({
                message: "Keep another way to sign in before unlinking this one",
                code: ACCOUNT_SECURITY_ERRORS.lastSignInMethod,
            });
        }
        await this.identities.unlink(userId, IdentityProvider[provider]);
    }
}
