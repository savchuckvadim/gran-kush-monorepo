import { Injectable } from "@nestjs/common";

import type { SessionAudience } from "@modules/portal/auth/sessions/domain/auth-session";

import { IdentityError } from "../../domain/identity-error";
import type { ExternalProfile } from "../../domain/identity-provider";
import { LinkIdentityUseCase } from "../use-cases/link-identity.use-case";

import { OAuthRedirectFlowService } from "./oauth-redirect-flow.service";
import { LINK_RETURN_PATH } from "./oauth-redirect-flow.types";
import type { RedirectSignInResult } from "./redirect-sign-in";

/**
 * Привязка способа входа, начатая со страницы «Вход и безопасность»: возврат туда же с исходом в
 * параметре по имени провайдера — `?google=linked` или код отказа (`google_taken`). Человек уже
 * вошёл, поэтому отказ — не на форму входа.
 */
@Injectable()
export class LinkFromRedirectService {
    constructor(
        private readonly link: LinkIdentityUseCase,
        private readonly flow: OAuthRedirectFlowService
    ) {}

    async complete(
        audience: SessionAudience,
        userId: string,
        profile: ExternalProfile,
        locale: string
    ): Promise<RedirectSignInResult> {
        try {
            await this.link.execute(userId, profile);
            return { redirect: this.resultUrl(audience, locale, profile.provider, "linked") };
        } catch (error: unknown) {
            if (!(error instanceof IdentityError)) throw error;
            return { redirect: this.resultUrl(audience, locale, profile.provider, error.code) };
        }
    }

    /** Страница «Вход и безопасность» с исходом привязки. */
    resultUrl(audience: SessionAudience, locale: string, provider: string, result: string): string {
        const url = new URL(
            this.flow.successUrl(audience, locale, `/${locale}${LINK_RETURN_PATH[audience]}`)
        );
        url.searchParams.set(provider, result);
        return url.toString();
    }
}
