import { Controller, Get, Logger, Query, Req, Res } from "@nestjs/common";
import { ApiExcludeEndpoint, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import type { Request, Response } from "express";

import { AUTH_THROTTLE } from "@common/config/throttler/throttler.config";
import { Public } from "@common/decorators/auth/public.decorator";
import { SessionHttpService } from "@modules/portal/auth/sessions/api/session-http.service";
import { SESSION_AUDIENCES } from "@modules/portal/auth/sessions/domain/auth-session";
import { EmployeeGoogleSignInService } from "@modules/portal/auth/social/application/services/employee-google-sign-in.service";
import { GoogleOAuthFlowService } from "@modules/portal/auth/social/application/services/google-oauth-flow.service";
import {
    GoogleFlowError,
    OAUTH_FLOW_COOKIE,
} from "@modules/portal/auth/social/application/services/google-oauth-flow.types";

/**
 * Google-вход в CRM: обычный вход, приём приглашения сотрудника (`intent=invitation`) и
 * регистрация клуба (`intent=club_signup`). Что делать после возврата —
 * `EmployeeGoogleSignInService`; защита входа (nonce, PKCE, подпись state, фильтр страницы
 * возврата) — `GoogleOAuthFlowService`.
 */
@ApiTags("Employee Authentication (CRM Web)")
@Controller("crm/auth/google")
export class EmployeeGoogleAuthController {
    private readonly logger = new Logger(EmployeeGoogleAuthController.name);

    constructor(
        private readonly flow: GoogleOAuthFlowService,
        private readonly signIn: EmployeeGoogleSignInService,
        private readonly sessionHttp: SessionHttpService
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
    @ApiQuery({
        name: "intent",
        required: false,
        enum: ["invitation", "club_signup"],
        description: "invitation — принять приглашение (нужен token); club_signup — завести клуб",
    })
    @ApiQuery({
        name: "token",
        required: false,
        description: "Токен приглашения для intent=invitation",
    })
    start(
        @Query("locale") locale: string | undefined,
        @Query("returnTo") returnTo: string | undefined,
        @Query("intent") intent: string | undefined,
        @Query("token") token: string | undefined,
        @Res() response: Response
    ): void {
        if (!this.flow.isConfigured()) {
            response.redirect(this.loginUrl(this.flow.sanitizeLocale(locale), "google_off"));
            return;
        }
        const { url, cookieValue } = this.flow.buildStart(
            "crm",
            locale,
            returnTo,
            this.flow.parseIntent(intent, token)
        );
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
            const result = await this.signIn.complete(profile, verified);
            if (result.sessionUserId) {
                await this.sessionHttp.signIn(request, response, {
                    userId: result.sessionUserId,
                    audience: SESSION_AUDIENCES.Crm,
                    method: "google",
                });
            }
            response.redirect(result.redirect);
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
