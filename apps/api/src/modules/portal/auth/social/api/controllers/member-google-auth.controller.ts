import { Controller, Get, Headers, Logger, Query, Req, Res } from "@nestjs/common";
import { ApiExcludeEndpoint, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import type { Request, Response } from "express";

import { AUTH_GLOBAL_SCOPE, resolveDeviceIdFromHeaders } from "@common/auth";
import { AUTH_THROTTLE } from "@common/config/throttler/throttler.config";
import { AuthCookieService } from "@common/cookie/services/auth-cookie.service";
import { CurrentAuthUser } from "@common/decorators/auth/current-auth-user.decorator";
import { Public } from "@common/decorators/auth/public.decorator";
import { RequireUserJwt } from "@modules/portal/auth/members/api/decorators/require-member-jwt.decorator";
import { MemberAuthService } from "@modules/portal/auth/members/application/services/member-auth.service";
import type { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";
import { GoogleOAuthFlowService } from "@modules/portal/auth/social/application/services/google-oauth-flow.service";
import {
    GOOGLE_LINK_RESULT_PARAM,
    GoogleFlowError,
    type GoogleIntent,
    LINK_RETURN_PATH,
    OAUTH_FLOW_COOKIE,
} from "@modules/portal/auth/social/application/services/google-oauth-flow.types";
import { SocialLoginService } from "@modules/portal/auth/social/application/services/social-login.service";
import {
    GoogleLinkError,
    LinkGoogleUseCase,
} from "@modules/portal/auth/social/application/use-cases/link-google.use-case";

/**
 * Google-вход в кабинет участника. Браузерный редирект-флоу: /start уводит на Google и ставит
 * куку привязки, /callback проверяет её, ставит обычные member-куки и возвращает на страницу,
 * с которой человек пришёл. Защиту входа (nonce, PKCE, подпись state) описывает
 * `GoogleOAuthFlowService`. Ошибки не рендерим — возвращаем на форму входа с ?error=, причина
 * пишется в лог без персональных данных.
 *
 * Тот же флоу привязывает Google к аккаунту, который уже вошёл (/link, TASK-716): аккаунт едет
 * в подписанном state, а возврат — на страницу аккаунта с `?google=linked` или причиной отказа.
 */
@ApiTags("Cabinet Auth (web)")
@Controller("cabinet/auth/google")
export class MemberGoogleAuthController {
    private readonly logger = new Logger(MemberGoogleAuthController.name);

    constructor(
        private readonly flow: GoogleOAuthFlowService,
        private readonly socialLogin: SocialLoginService,
        private readonly memberAuthService: MemberAuthService,
        private readonly cookieService: AuthCookieService,
        private readonly linkGoogle: LinkGoogleUseCase
    ) {}

    @Get("start")
    @Public()
    @Throttle(AUTH_THROTTLE)
    @ApiOperation({ summary: "Начать вход через Google (редирект на Google)" })
    @ApiQuery({
        name: "returnTo",
        required: false,
        description: "Путь в кабинете, куда вернуть после входа (только относительный)",
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
        const { url, cookieValue } = this.flow.buildStart("member", locale, returnTo);
        response.cookie(OAUTH_FLOW_COOKIE, cookieValue, this.flow.flowCookieOptions("member"));
        response.redirect(url);
    }

    @Get("link")
    @RequireUserJwt()
    @Throttle(AUTH_THROTTLE)
    @ApiOperation({ summary: "Привязать Google к своему аккаунту (редирект на Google)" })
    link(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Query("locale") locale: string | undefined,
        @Res() response: Response
    ): void {
        const safeLocale = this.flow.sanitizeLocale(locale);
        if (!this.flow.isConfigured()) {
            response.redirect(this.linkResultUrl(safeLocale, "google_off"));
            return;
        }
        const intent: GoogleIntent = { kind: "link", userId: user.userId };
        const { url, cookieValue } = this.flow.buildStart(
            "member",
            safeLocale,
            LINK_RETURN_PATH,
            intent
        );
        response.cookie(OAUTH_FLOW_COOKIE, cookieValue, this.flow.flowCookieOptions("member"));
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
        // Кука нужна один раз: удаляем её при любом исходе, повторный заход по ссылке не пройдёт
        const flowCookie = (request.cookies as Record<string, string> | undefined)?.[
            OAUTH_FLOW_COOKIE
        ];
        response.clearCookie(OAUTH_FLOW_COOKIE, this.flow.flowCookieOptions("member"));
        try {
            const verified = this.flow.verifyCallback("member", state, flowCookie);
            locale = verified.locale;
            if (oauthError || !code) {
                throw new GoogleFlowError("provider_error");
            }
            const profile = await this.flow.exchangeCode("member", code, verified.binding);
            if (verified.intent?.kind === "link") {
                await this.linkGoogle.execute(verified.intent.userId, profile);
                response.redirect(this.linkResultUrl(locale, "linked"));
                return;
            }
            const user = await this.socialLogin.loginMemberWithGoogle(profile);
            const deviceId = resolveDeviceIdFromHeaders(headers);
            const tokens = await this.memberAuthService.generateTokens(
                { id: user.id, email: user.email },
                deviceId
            );
            this.cookieService.setAuthCookies(response, AUTH_GLOBAL_SCOPE.SITE, tokens);
            response.redirect(this.flow.successUrl("member", locale, verified.returnTo));
        } catch (error: unknown) {
            this.logFailure(error);
            // Отказ привязки возвращает на страницу аккаунта: человек уже вошёл
            if (error instanceof GoogleLinkError) {
                response.redirect(this.linkResultUrl(locale, error.reason));
                return;
            }
            response.redirect(this.loginUrl(locale, "google_auth"));
        }
    }

    private logFailure(error: unknown): void {
        const reason =
            error instanceof GoogleFlowError || error instanceof GoogleLinkError
                ? error.reason
                : "login_rejected";
        this.logger.warn(`Member Google sign-in rejected: ${reason}`);
    }

    /** Страница аккаунта с исходом привязки: `linked` или причина отказа. */
    private linkResultUrl(locale: string, result: string): string {
        const url = new URL(
            this.flow.successUrl("member", locale, `/${locale}${LINK_RETURN_PATH}`)
        );
        url.searchParams.set(GOOGLE_LINK_RESULT_PARAM, result);
        return url.toString();
    }

    private loginUrl(locale: string, error: string): string {
        return `${this.flow.frontendUrl("member")}/${locale}/auth/login?error=${error}`;
    }
}
