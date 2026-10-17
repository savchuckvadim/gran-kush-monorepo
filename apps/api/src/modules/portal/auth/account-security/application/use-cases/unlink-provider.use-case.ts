import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";

import type { IdentityProviderKey } from "@modules/portal/auth/identity/domain/identity-provider";
import { UserIdentityRepository } from "@modules/portal/auth/identity/domain/repositories/user-identity-repository.interface";

import { ACCOUNT_SECURITY_ERRORS, notLinkedCode } from "../../domain/account-security-errors";
import { AccountSecurityService } from "../services/account-security.service";

/**
 * Отвязать способ входа через провайдера (TASK-716, TASK-738). Последний способ входа не снимается:
 * без пароля и другой привязки войти было бы нечем (`last_sign_in_method`) — сначала задать пароль
 * или привязать другой. Сессии не отзываются: владелец убирает способ входа, а не теряет доступ.
 */
@Injectable()
export class UnlinkProviderUseCase {
    constructor(
        private readonly security: AccountSecurityService,
        private readonly identities: UserIdentityRepository
    ) {}

    async execute(userId: string, provider: IdentityProviderKey): Promise<void> {
        const methods = await this.security.signInMethods(userId);
        if (!methods.linked.some((identity) => identity.provider === provider)) {
            throw new NotFoundException({
                message: `${provider} is not linked`,
                code: notLinkedCode(provider),
            });
        }
        const others = methods.linked.filter((identity) => identity.provider !== provider);
        if (!methods.hasPassword && others.length === 0) {
            throw new ConflictException({
                message: "Keep another way to sign in before unlinking this one",
                code: ACCOUNT_SECURITY_ERRORS.lastSignInMethod,
            });
        }
        await this.identities.unlink(userId, provider);
    }
}
