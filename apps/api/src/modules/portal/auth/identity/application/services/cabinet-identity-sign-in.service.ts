import { Injectable } from "@nestjs/common";

import { SESSION_AUDIENCES } from "@modules/portal/auth/sessions/domain/auth-session";

import { IdentityError } from "../../domain/identity-error";
import type { ExternalProfile } from "../../domain/identity-provider";
import { SignInWithIdentityUseCase } from "../use-cases/sign-in-with-identity.use-case";

import { LinkFromRedirectService } from "./link-from-redirect.service";
import { OAuthRedirectFlowService } from "./oauth-redirect-flow.service";
import type { VerifiedCallback } from "./oauth-redirect-flow.types";
import type { RedirectSignInCompletion, RedirectSignInResult } from "./redirect-sign-in";

/**
 * Возврат от провайдера в кабинет: привязка (`intent=link`) — на «Вход и безопасность»; иначе вход
 * (аккаунт без клуба допустим: вступит по ссылке клуба) и возврат на страницу, с которой пришли.
 */
@Injectable()
export class CabinetIdentitySignInService implements RedirectSignInCompletion {
    constructor(
        private readonly signIn: SignInWithIdentityUseCase,
        private readonly linkFromRedirect: LinkFromRedirectService,
        private readonly flow: OAuthRedirectFlowService
    ) {}

    async complete(
        profile: ExternalProfile,
        verified: VerifiedCallback
    ): Promise<RedirectSignInResult> {
        const audience = SESSION_AUDIENCES.Cabinet;
        if (verified.intent?.kind === "link") {
            return this.linkFromRedirect.complete(
                audience,
                verified.intent.userId,
                profile,
                verified.locale
            );
        }
        const result = await this.signIn.execute(audience, profile);
        // Редирект-провайдер без подтверждённой почты: шага почты в редиректе нет
        if (result.kind === "email_required")
            throw new IdentityError("unverified", profile.provider);
        return {
            redirect: this.flow.successUrl(audience, verified.locale, verified.returnTo),
            sessionUserId: result.user.id,
        };
    }
}
