import { Controller, Get, Headers, Logger, Query, Req, Res } from "@nestjs/common";
import { ApiExcludeEndpoint, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import type { Request, Response } from "express";

import { AUTH_GLOBAL_SCOPE, resolveDeviceIdFromHeaders } from "@common/auth";
import { AUTH_THROTTLE } from "@common/config/throttler/throttler.config";
import { AuthCookieService } from "@common/cookie/services/auth-cookie.service";
import { Public } from "@common/decorators/auth/public.decorator";
import { EmployeeAuthService } from "@modules/portal/auth/employees/application/services/employee-auth.service";
import {
    GoogleFlowError,
    GoogleOAuthFlowService,
    OAUTH_FLOW_COOKIE,
} from "@modules/portal/auth/social/application/services/google-oauth-flow.service";
import { SocialLoginService } from "@modules/portal/auth/social/application/services/social-login.service";

/**
 * Google-вход в CRM. Аккаунта с таким email нет (или нет ни одного клуба) —
 * ведём на регистрацию клуба с предзаполненным email; аккаунт заранее не создаём,
 * иначе регистрация клуба упрётся в 409 «email занят» (TASK-508).
 * Защита входа (nonce, PKCE, подпись state, фильтр страницы возврата) — в
 * `GoogleOAuthFlowService`.
 */
@ApiTags("Employee Authentication (CRM Web)")
@Controller("crm/auth/google")
export class EmployeeGoogleAuthController {
    private readonly logger = new Logger(EmployeeGoogleAuthController.name);

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
    @ApiQuery({
        name: "returnTo",
        required: false,
        description: "Путь в CRM, куда вернуть после входа (только относительный)",
    })
    start(
        @Query("locale") locale: string | undefined,
        @Query("returnTo") returnTo: string | undefined,
        @Res() response: Response
    ): void {
        if (!this.flow.isConfigured()) {
            response.redirect(this.loginUrl(this.flow.sanitizeLocale(locale), "google_off"));
            return;
        }
        const { url, cookieValue } = this.flow.buildStart("crm", locale, returnTo);
        response.cookie(OAUTH_FLOW_COOKIE, cookieValue, this.flow.flowCookieOptions("crm"));
        response.redirect(url);
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
        @Req() request: Request,
        @Res() response: Response
    ): Promise<void> {
        let locale = this.flow.sanitizeLocale(undefined);
        const flowCookie = (request.cookies as Record<string, string> | undefined)?.[
            OAUTH_FLOW_COOKIE
        ];
        response.clearCookie(OAUTH_FLOW_COOKIE, this.flow.flowCookieOptions("crm"));
        try {
            const verified = this.flow.verifyCallback("crm", state, flowCookie);
            locale = verified.locale;
            if (oauthError || !code) {
                throw new GoogleFlowError("provider_error");
            }
            const profile = await this.flow.exchangeCode("crm", code, verified.binding);
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
            response.redirect(this.flow.successUrl("crm", locale, verified.returnTo));
        } catch (error: unknown) {
            const reason = error instanceof GoogleFlowError ? error.reason : "login_rejected";
            this.logger.warn(`CRM Google sign-in rejected: ${reason}`);
            response.redirect(this.loginUrl(locale, "google_auth"));
        }
    }

    private loginUrl(locale: string, error: string): string {
        return `${this.flow.frontendUrl("crm")}/${locale}/auth/login?error=${error}`;
    }
}
