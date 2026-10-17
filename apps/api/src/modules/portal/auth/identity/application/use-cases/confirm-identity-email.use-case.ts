import { Injectable } from "@nestjs/common";

import { UserAccountStatus } from "@prisma/client";
import { User } from "@users/domain/entity/user.entity";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";

import type { SessionAudience } from "@modules/portal/auth/sessions/domain/auth-session";
import { AuthTokensService } from "@modules/portal/auth/tokens/application/auth-tokens.service";
import { AUTH_TOKEN_PURPOSES } from "@modules/portal/auth/tokens/domain/auth-token";

import { IdentityError } from "../../domain/identity-error";
import {
    type ExternalProfile,
    type IdentityProviderKey,
    parseExternalProfile,
} from "../../domain/identity-provider";
import { IdentityAccountsService } from "../services/identity-accounts.service";

import type { IdentityEmailLinkPayload } from "./request-identity-email.use-case";

/**
 * Ссылка из письма шага «укажите почту»: адрес доказан. Правила:
 * - аккаунт с этой почтой есть — способ входа привязывается к нему, аккаунт заявляется
 *   (`IdentityAccountsService.claimAccount`): неподтверждённый активируется, его пароль сбрасывается;
 * - аккаунта нет — заводится новый, без пароля, с подтверждённой почтой;
 * - способ, который за это время привязали к другому аккаунту, не перепривязывается (`taken`);
 * - ссылка одноразовая и работает только в своём приложении: повтор, ссылка из более раннего
 *   письма или из другого приложения — `link`.
 * Ожидающие членства ссылка не подтверждает — это делает владелец сам (TASK-703).
 */
@Injectable()
export class ConfirmIdentityEmailUseCase {
    constructor(
        private readonly authTokens: AuthTokensService,
        private readonly accounts: IdentityAccountsService,
        private readonly users: UserRepository
    ) {}

    /** Аккаунт, получающий сессию, и способ входа, которым он вошёл. */
    async execute(
        audience: SessionAudience,
        token: string
    ): Promise<{ user: User; provider: IdentityProviderKey }> {
        const { profile, email } = await this.readLink(audience, token);
        const existing = await this.users.findByEmail(email);
        const owner = await this.accounts.findLinked(profile);
        if (owner && owner.id !== existing?.id) {
            throw new IdentityError("taken", profile.provider);
        }
        if (existing?.status === UserAccountStatus.blocked) {
            throw new IdentityError("account_blocked");
        }

        const user = existing
            ? await this.accounts.claimAccount(existing)
            : await this.accounts.createConfirmed(email, profile);
        await this.accounts.link(user.id, profile);
        return { user, provider: profile.provider };
    }

    private async readLink(
        audience: SessionAudience,
        token: string
    ): Promise<{ profile: ExternalProfile; email: string }> {
        const result = await this.authTokens.consume(AUTH_TOKEN_PURPOSES.IdentityEmailLink, token);
        if (result.kind !== "consumed" || !result.token.email) throw new IdentityError("link");
        const payload = result.token.payload as Partial<IdentityEmailLinkPayload> | null;
        const profile = parseExternalProfile(payload?.profile);
        if (payload?.audience !== audience || !profile) throw new IdentityError("link");
        return { profile, email: result.token.email };
    }
}
