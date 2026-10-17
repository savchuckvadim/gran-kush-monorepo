import { ConflictException, ForbiddenException, Injectable } from "@nestjs/common";

import { UserRepository } from "@users/domain/repositories/user-repository.interface";

import { SESSION_AUDIENCES } from "@modules/portal/auth/sessions/domain/auth-session";
import { InvitationAcceptanceService } from "@modules/portal/crm/invitations/application/services/invitation-acceptance.service";
import { InvitationsService } from "@modules/portal/crm/invitations/application/services/invitations.service";

import { IdentityError } from "../../domain/identity-error";
import type { ExternalProfile } from "../../domain/identity-provider";
import { SignInWithIdentityUseCase } from "../use-cases/sign-in-with-identity.use-case";

import { IdentityAccountsService } from "./identity-accounts.service";
import { LinkFromRedirectService } from "./link-from-redirect.service";
import { OAuthRedirectFlowService } from "./oauth-redirect-flow.service";
import type { VerifiedCallback } from "./oauth-redirect-flow.types";
import type { RedirectSignInCompletion, RedirectSignInResult } from "./redirect-sign-in";

/** Страница CRM «Новый клуб»: туда ведут вход без клубов и вход ради нового клуба. */
const NEW_CLUB_PATH = "/clubs/new";

/** Почему приглашение не принято: попадает в адрес страницы приглашения, без персональных данных. */
type InvitationFailure = "invite_email_mismatch" | "invite_invalid" | "invite_already_employee";

/**
 * Возврат от провайдера в CRM.
 *
 * - Без намерения — обычный вход. Аккаунт находится или заводится (провайдер доказал адрес),
 *   сессия выдаётся всегда; без клубов — на «Новый клуб».
 * - `club_signup` — вход ради нового клуба: на «Новый клуб» (или страницу из `returnTo` — там же
 *   тариф с сайта), даже если клубы уже есть.
 * - `invitation` — приём приглашения: подтверждённый провайдером адрес должен совпасть с адресом
 *   приглашения. Сверка идёт ДО поиска аккаунта, чтобы чужой адрес не заводил аккаунтов.
 * - `link` — привязка способа к аккаунту сессии, возврат на «Вход и безопасность».
 */
@Injectable()
export class CrmIdentitySignInService implements RedirectSignInCompletion {
    constructor(
        private readonly flow: OAuthRedirectFlowService,
        private readonly signIn: SignInWithIdentityUseCase,
        private readonly accounts: IdentityAccountsService,
        private readonly linkFromRedirect: LinkFromRedirectService,
        private readonly users: UserRepository,
        private readonly invitations: InvitationsService,
        private readonly acceptance: InvitationAcceptanceService
    ) {}

    async complete(
        profile: ExternalProfile,
        verified: VerifiedCallback
    ): Promise<RedirectSignInResult> {
        const audience = SESSION_AUDIENCES.Crm;
        const { intent, locale, returnTo } = verified;
        if (intent?.kind === "link") {
            return this.linkFromRedirect.complete(audience, intent.userId, profile, locale);
        }
        if (intent?.kind === "invitation") {
            return this.acceptInvitation(profile, intent.token, locale);
        }

        const result = await this.signIn.execute(audience, profile);
        if (result.kind === "email_required")
            throw new IdentityError("unverified", profile.provider);
        const sessionUserId = result.user.id;
        const newClub = `${this.flow.frontendUrl(audience)}/${locale}${NEW_CLUB_PATH}`;
        if (intent?.kind === "club_signup") {
            return {
                redirect: returnTo ? this.flow.successUrl(audience, locale, returnTo) : newClub,
                sessionUserId,
            };
        }
        if (!(await this.hasClubs(result.user.email))) {
            return { redirect: newClub, sessionUserId };
        }
        return { redirect: this.flow.successUrl(audience, locale, returnTo), sessionUserId };
    }

    private async hasClubs(email: string): Promise<boolean> {
        const account = await this.users.findByEmailWithMemberships(email);
        return (account?.employees ?? []).some((employee) => employee.isActive);
    }

    private async acceptInvitation(
        profile: ExternalProfile,
        token: string,
        locale: string
    ): Promise<RedirectSignInResult> {
        const front = this.flow.frontendUrl(SESSION_AUDIENCES.Crm);
        const backToInvitation = (reason: InvitationFailure) => ({
            redirect: `${front}/${locale}/auth/invite/${token}?error=${reason}`,
        });

        let invitedEmail: string;
        try {
            invitedEmail = (await this.invitations.getActiveByToken(token)).email;
        } catch {
            return backToInvitation("invite_invalid");
        }
        const email = profile.email?.trim().toLowerCase();
        if (!profile.emailVerified || email !== invitedEmail) {
            return backToInvitation("invite_email_mismatch");
        }

        const account = await this.accounts.findOrCreateByVerifiedEmail(profile);
        try {
            const result = await this.acceptance.acceptWithVerifiedAccount(token, account);
            return {
                redirect: `${front}/${locale}/${result.response.portalSlug}/crm`,
                sessionUserId: result.sessionUserId,
            };
        } catch (error: unknown) {
            if (error instanceof ConflictException) {
                return backToInvitation("invite_already_employee");
            }
            if (error instanceof ForbiddenException) {
                return backToInvitation("invite_email_mismatch");
            }
            return backToInvitation("invite_invalid");
        }
    }
}
