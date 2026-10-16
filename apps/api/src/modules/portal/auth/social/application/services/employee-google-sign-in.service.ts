import { ConflictException, ForbiddenException, Injectable } from "@nestjs/common";

import { EmployeeAuthService } from "@modules/portal/auth/employees/application/services/employee-auth.service";
import { GoogleProfile } from "@modules/portal/auth/social/domain/social-profile";
import { InvitationAcceptanceService } from "@modules/portal/crm/invitations/application/services/invitation-acceptance.service";
import { InvitationsService } from "@modules/portal/crm/invitations/application/services/invitations.service";

import { GoogleOAuthFlowService } from "./google-oauth-flow.service";
import type { GoogleIntent } from "./google-oauth-flow.types";
import { SocialLoginService } from "./social-login.service";

/** Куда отправить браузер и, если вход состоялся, какие токены положить в куки CRM. */
export interface EmployeeGoogleSignInResult {
    redirect: string;
    tokens?: { accessToken: string; refreshToken: string };
}

/** Почему приглашение не принято: попадает в адрес страницы приглашения, без персональных данных. */
type InvitationFailure = "invite_email_mismatch" | "invite_invalid" | "invite_already_employee";

/**
 * Что сделать после проверенного возврата от Google в CRM.
 *
 * - Без намерения — обычный вход: сотрудник получает сессию, аккаунт без клубов идёт на
 *   регистрацию клуба (аккаунт заранее не создаётся, TASK-508).
 * - `invitation` — приём приглашения: адрес из Google должен совпасть с адресом приглашения.
 *   Сверка идёт ДО поиска аккаунта, чтобы чужой Google-адрес не заводил аккаунтов.
 */
@Injectable()
export class EmployeeGoogleSignInService {
    constructor(
        private readonly flow: GoogleOAuthFlowService,
        private readonly socialLogin: SocialLoginService,
        private readonly employeeAuthService: EmployeeAuthService,
        private readonly invitations: InvitationsService,
        private readonly acceptance: InvitationAcceptanceService
    ) {}

    async complete(
        profile: GoogleProfile,
        context: { locale: string; returnTo?: string; intent?: GoogleIntent },
        deviceId: string
    ): Promise<EmployeeGoogleSignInResult> {
        if (context.intent?.kind === "invitation") {
            return this.acceptInvitation(profile, context.intent.token, context.locale, deviceId);
        }

        const result = await this.socialLogin.loginEmployeeWithGoogle(profile);
        const front = this.flow.frontendUrl("crm");
        if (result.kind === "no_employment") {
            const email = encodeURIComponent(result.email);
            return {
                redirect: `${front}/${context.locale}/auth/register?email=${email}&from=google`,
            };
        }
        const tokens = await this.employeeAuthService.generateTokens(
            { id: result.user.id, email: result.user.email },
            deviceId
        );
        return { redirect: this.flow.successUrl("crm", context.locale, context.returnTo), tokens };
    }

    private async acceptInvitation(
        profile: GoogleProfile,
        token: string,
        locale: string,
        deviceId: string
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
            const result = await this.acceptance.acceptWithVerifiedAccount(
                token,
                account,
                deviceId
            );
            return {
                redirect: `${front}/${locale}/${result.response.portalSlug}/crm`,
                tokens: result.tokens,
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
