import { ConflictException, ForbiddenException, Injectable } from "@nestjs/common";

import { GoogleProfile } from "@modules/portal/auth/social/domain/social-profile";
import { InvitationAcceptanceService } from "@modules/portal/crm/invitations/application/services/invitation-acceptance.service";
import { InvitationsService } from "@modules/portal/crm/invitations/application/services/invitations.service";

import { GoogleOAuthFlowService } from "./google-oauth-flow.service";
import type { GoogleIntent } from "./google-oauth-flow.types";
import { SocialLoginService } from "./social-login.service";

/** Куда отправить браузер и, если вход состоялся, чей аккаунт получает сессию CRM. */
export interface EmployeeGoogleSignInResult {
    redirect: string;
    sessionUserId?: string;
}

/** Страница CRM «Новый клуб»: туда ведут вход без клубов и вход ради нового клуба. */
const NEW_CLUB_PATH = "/clubs/new";

/** Почему приглашение не принято: попадает в адрес страницы приглашения, без персональных данных. */
type InvitationFailure = "invite_email_mismatch" | "invite_invalid" | "invite_already_employee";

/**
 * Что сделать после проверенного возврата от Google в CRM.
 *
 * - Без намерения — обычный вход. Аккаунт находится или заводится (Google доказал адрес), сессия
 *   выдаётся всегда; без клубов — на «Новый клуб».
 * - `club_signup` — вход ради нового клуба: на «Новый клуб» (или страницу из `returnTo` — там же
 *   тариф с сайта), даже если клубы уже есть.
 * - `invitation` — приём приглашения: адрес из Google должен совпасть с адресом приглашения.
 *   Сверка идёт ДО поиска аккаунта, чтобы чужой Google-адрес не заводил аккаунтов.
 */
@Injectable()
export class EmployeeGoogleSignInService {
    constructor(
        private readonly flow: GoogleOAuthFlowService,
        private readonly socialLogin: SocialLoginService,
        private readonly invitations: InvitationsService,
        private readonly acceptance: InvitationAcceptanceService
    ) {}

    async complete(
        profile: GoogleProfile,
        context: { locale: string; returnTo?: string; intent?: GoogleIntent }
    ): Promise<EmployeeGoogleSignInResult> {
        if (context.intent?.kind === "invitation") {
            return this.acceptInvitation(profile, context.intent.token, context.locale);
        }

        const { user, hasClubs } = await this.socialLogin.loginEmployeeWithGoogle(profile);
        const sessionUserId = user.id;
        const newClub = `${this.flow.frontendUrl("crm")}/${context.locale}${NEW_CLUB_PATH}`;
        if (context.intent?.kind === "club_signup") {
            return {
                redirect: context.returnTo
                    ? this.flow.successUrl("crm", context.locale, context.returnTo)
                    : newClub,
                sessionUserId,
            };
        }
        if (!hasClubs) {
            return { redirect: newClub, sessionUserId };
        }
        return {
            redirect: this.flow.successUrl("crm", context.locale, context.returnTo),
            sessionUserId,
        };
    }

    private async acceptInvitation(
        profile: GoogleProfile,
        token: string,
        locale: string
    ): Promise<EmployeeGoogleSignInResult> {
        const front = this.flow.frontendUrl("crm");
        const backToInvitation = (reason: InvitationFailure) => ({
            redirect: `${front}/${locale}/auth/invite/${token}?error=${reason}`,
        });

        let invitedEmail: string;
        try {
            invitedEmail = (await this.invitations.getActiveByToken(token)).email;
        } catch {
            return backToInvitation("invite_invalid");
        }
        if (!profile.emailVerified || profile.email.trim().toLowerCase() !== invitedEmail) {
            return backToInvitation("invite_email_mismatch");
        }

        const account = await this.socialLogin.findOrCreateAccount(profile);
        try {
            const result = await this.acceptance.acceptWithVerifiedAccount(token, account);
            return {
                redirect: `${front}/${locale}/${result.response.portalSlug}/crm`,
                sessionUserId: result.sessionUserId,
            };
        } catch (error: unknown) {
            if (error instanceof ConflictException)
                return backToInvitation("invite_already_employee");
            if (error instanceof ForbiddenException)
                return backToInvitation("invite_email_mismatch");
            return backToInvitation("invite_invalid");
        }
    }
}
