import { Injectable } from "@nestjs/common";

import { UserAccountStatus } from "@prisma/client";
import { User } from "@users/domain/entity/user.entity";

import type { SessionAudience } from "@modules/portal/auth/sessions/domain/auth-session";

import { IdentityError } from "../../domain/identity-error";
import type { ExternalProfile } from "../../domain/identity-provider";
import { IdentityAccountsService } from "../services/identity-accounts.service";
import { IdentityTicketService } from "../services/identity-ticket.service";

export type IdentitySignIn =
    | { kind: "signed_in"; user: User }
    /** Способ не привязан, а почту провайдер не подтвердил: нужен шаг «укажите почту» */
    | { kind: "email_required"; ticket: string };

/**
 * Вход через провайдера (AUTH_ARCHITECTURE §6.3). Правила:
 * - способ уже привязан — вход в этот аккаунт, профиль привязки обновляется; заблокированный
 *   аккаунт не входит;
 * - не привязан, но провайдер подтвердил почту — аккаунт находится по адресу (и заявляется этим
 *   входом) или заводится, способ привязывается;
 * - почты нет (Telegram) — входа нет: билет на шаг «укажите почту». Аккаунт появится только после
 *   ссылки из письма (`ConfirmIdentityEmailUseCase`): так в аккаунт с чужой почтой не войти.
 */
@Injectable()
export class SignInWithIdentityUseCase {
    constructor(
        private readonly accounts: IdentityAccountsService,
        private readonly tickets: IdentityTicketService
    ) {}

    async execute(audience: SessionAudience, profile: ExternalProfile): Promise<IdentitySignIn> {
        const linked = await this.accounts.findLinked(profile);
        if (linked) {
            if (linked.status === UserAccountStatus.blocked) {
                throw new IdentityError("account_blocked");
            }
            await this.accounts.link(linked.id, profile);
            return { kind: "signed_in", user: linked };
        }
        if (profile.email && profile.emailVerified) {
            return {
                kind: "signed_in",
                user: await this.accounts.findOrCreateByVerifiedEmail(profile),
            };
        }
        return { kind: "email_required", ticket: this.tickets.issue(audience, profile) };
    }
}
