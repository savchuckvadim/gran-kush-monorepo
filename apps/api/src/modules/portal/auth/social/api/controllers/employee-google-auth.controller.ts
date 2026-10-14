import { Controller, Get, Headers, Query, Res } from "@nestjs/common";
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import type { Response } from "express";

import { AUTH_GLOBAL_SCOPE, resolveDeviceIdFromHeaders } from "@common/auth";
import { AUTH_THROTTLE } from "@common/config/throttler/throttler.config";
import { AuthCookieService } from "@common/cookie/services/auth-cookie.service";
import { Public } from "@common/decorators/auth/public.decorator";
import { EmployeeAuthService } from "@modules/portal/auth/employees/application/services/employee-auth.service";
import { GoogleOAuthFlowService } from "@modules/portal/auth/social/application/services/google-oauth-flow.service";
import { SocialLoginService } from "@modules/portal/auth/social/application/services/social-login.service";

/**
 * Google-вход в CRM. Аккаунта с таким email нет (или нет ни одного клуба) —
 * ведём на регистрацию клуба с предзаполненным email; аккаунт заранее не создаём,
 * иначе регистрация клуба упрётся в 409 «email занят» (TASK-508).
 */
@ApiTags("Employee Authentication (CRM Web)")
@Controller("crm/auth/google")
export class EmployeeGoogleAuthController {
    constructor(
        private readonly flow: GoogleOAuthFlowService,
        private readonly socialLogin: SocialLoginService,
        private readonly employeeAuthService: EmployeeAuthService,
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
        response.redirect(this.flow.buildStartUrl("crm", locale));
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
            ({ locale } = this.flow.verifyState("crm", state));
            if (oauthError || !code) {
                response.redirect(this.loginUrl(locale, "google_auth"));
                return;
            }
            const profile = await this.flow.exchangeCode("crm", code);
            const result = await this.socialLogin.loginEmployeeWithGoogle(profile);
            const front = this.flow.frontendUrl("crm");
            if (result.kind === "no_employment") {
                const email = encodeURIComponent(result.email);
                response.redirect(`${front}/${locale}/auth/register?email=${email}&from=google`);
                return;
            }
            const deviceId = resolveDeviceIdFromHeaders(headers);
            const tokens = await this.employeeAuthService.generateTokens(
                { id: result.user.id, email: result.user.email },
                deviceId
            );
            this.cookieService.setAuthCookies(response, AUTH_GLOBAL_SCOPE.CRM, tokens);
            response.redirect(`${front}/${locale}`);
        } catch {
            response.redirect(this.loginUrl(locale, "google_auth"));
        }
    }

    private loginUrl(locale: string, error: string): string {
        return `${this.flow.frontendUrl("crm")}/${locale}/auth/login?error=${error}`;
    }
}
