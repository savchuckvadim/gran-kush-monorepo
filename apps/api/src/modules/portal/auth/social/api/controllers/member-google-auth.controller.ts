import { Controller, Get, Headers, Query, Res } from "@nestjs/common";
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import type { Response } from "express";

import { AUTH_GLOBAL_SCOPE, resolveDeviceIdFromHeaders } from "@common/auth";
import { AUTH_THROTTLE } from "@common/config/throttler/throttler.config";
import { AuthCookieService } from "@common/cookie/services/auth-cookie.service";
import { Public } from "@common/decorators/auth/public.decorator";
import { MemberAuthService } from "@modules/portal/auth/members/application/services/member-auth.service";
import { GoogleOAuthFlowService } from "@modules/portal/auth/social/application/services/google-oauth-flow.service";
import { SocialLoginService } from "@modules/portal/auth/social/application/services/social-login.service";

/**
 * Google-вход в кабинет участника. Браузерный редирект-флоу: /start уводит на Google,
 * /callback ставит обычные member-куки и возвращает в кабинет. Ошибки не рендерим —
 * возвращаем на форму входа с ?error=, текст показывает фронт.
 */
@ApiTags("Member Authentication (Site Web)")
@Controller("lk/auth/google")
export class MemberGoogleAuthController {
    constructor(
        private readonly flow: GoogleOAuthFlowService,
        private readonly socialLogin: SocialLoginService,
        private readonly memberAuthService: MemberAuthService,
        private readonly cookieService: AuthCookieService
    ) {}

    @Get("start")
    @Public()
    @Throttle(AUTH_THROTTLE)
    @ApiOperation({ summary: "Начать вход через Google (редирект на Google)" })
    start(@Query("locale") locale: string | undefined, @Res() response: Response): void {
        if (!this.flow.isConfigured()) {
            response.redirect(this.loginUrl(this.flow.sanitizeLocale(locale), "google_off"));
            return;
        }
        response.redirect(this.flow.buildStartUrl("member", locale));
    }

    @Get("callback")
    @Public()
    @Throttle(AUTH_THROTTLE)
    @ApiExcludeEndpoint()
    async callback(
        @Query("code") code: string | undefined,
        @Query("state") state: string | undefined,
        @Query("error") oauthError: string | undefined,
        @Headers() headers: Record<string, string | string[] | undefined>,
        @Res() response: Response
    ): Promise<void> {
        let locale = this.flow.sanitizeLocale(undefined);
        try {
            ({ locale } = this.flow.verifyState("member", state));
            if (oauthError || !code) {
                response.redirect(this.loginUrl(locale, "google_auth"));
                return;
            }
            const profile = await this.flow.exchangeCode("member", code);
            const user = await this.socialLogin.loginMemberWithGoogle(profile);
            const deviceId = resolveDeviceIdFromHeaders(headers);
            const tokens = await this.memberAuthService.generateTokens(
                { id: user.id, email: user.email },
                deviceId
            );
            this.cookieService.setAuthCookies(response, AUTH_GLOBAL_SCOPE.SITE, tokens);
            response.redirect(`${this.flow.frontendUrl("member")}/${locale}`);
        } catch {
            response.redirect(this.loginUrl(locale, "google_auth"));
        }
    }

    private loginUrl(locale: string, error: string): string {
        return `${this.flow.frontendUrl("member")}/${locale}/auth/login?error=${error}`;
    }
}
