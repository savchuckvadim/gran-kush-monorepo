import { Injectable, Logger } from "@nestjs/common";

import type { Request, Response } from "express";

import type { SupportedLanguage } from "@modules/mail/consts/mail.constants";
import { SessionHttpService } from "@modules/portal/auth/sessions/api/session-http.service";
import type { SessionAudience } from "@modules/portal/auth/sessions/domain/auth-session";

import { IdentityProviderRegistry } from "../application/identity-provider.registry";
import { LinkFromRedirectService } from "../application/services/link-from-redirect.service";
import { OAuthRedirectFlowService } from "../application/services/oauth-redirect-flow.service";
import {
    LINK_RETURN_PATH,
    OAUTH_FLOW_COOKIE,
    OAuthFlowError,
} from "../application/services/oauth-redirect-flow.types";
import type { RedirectSignInCompletion } from "../application/services/redirect-sign-in";
import { ConfirmIdentityEmailUseCase } from "../application/use-cases/confirm-identity-email.use-case";
import { RequestIdentityEmailUseCase } from "../application/use-cases/request-identity-email.use-case";
import { SignInWithIdentityUseCase } from "../application/use-cases/sign-in-with-identity.use-case";
import { IdentityError } from "../domain/identity-error";
import { type IdentityIntent, intentFromQuery } from "../domain/identity-intent";
import type { IdentityProviderKey, RedirectIdentityProvider } from "../domain/identity-provider";

import type {
    IdentityProvidersResponseDto,
    IdentitySignInResultDto,
    IdentityStartQueryDto,
    IdentityStatusDto,
} from "./dto/identity-auth.dto";
import { toIdentityHttpError } from "./identity-http-error";

/** Параметры, с которыми провайдер возвращает браузер. */
export interface OAuthCallbackQuery {
    code?: string;
    state?: string;
    error?: string;
}

/**
 * HTTP способов входа для контроллеров обеих аудиторий: редиректы, куки привязки, сессия. Что
 * делать с проверенным профилем, решают сценарии (`application/`); аудитории отличаются только
 * завершением редиректа (`RedirectSignInCompletion`). Отказы редиректа не рендерятся: браузер
 * возвращается на форму входа с `?error={provider}_auth`, причина — в лог без персональных данных.
 */
@Injectable()
export class IdentityHttpService {
    private readonly logger = new Logger(IdentityHttpService.name);

    constructor(
        private readonly registry: IdentityProviderRegistry,
        private readonly flow: OAuthRedirectFlowService,
        private readonly linkFromRedirect: LinkFromRedirectService,
        private readonly signIn: SignInWithIdentityUseCase,
        private readonly requestEmail: RequestIdentityEmailUseCase,
        private readonly confirmEmail: ConfirmIdentityEmailUseCase,
        private readonly sessionHttp: SessionHttpService
    ) {}

    providers(audience: SessionAudience): IdentityProvidersResponseDto {
        return { providers: this.registry.enabled(audience) };
    }

    /** Начать вход у редирект-провайдера; не настроен — назад на форму входа с `{provider}_off`. */
    start(
        audience: SessionAudience,
        providerKey: string,
        query: IdentityStartQueryDto,
        response: Response
    ): void {
        const locale = this.flow.sanitizeLocale(query.locale);
        const provider = this.redirectProvider(audience, providerKey);
        if (!provider) {
            response.redirect(this.loginUrl(audience, locale, `${providerKey}_off`));
            return;
        }
        this.redirectToProvider(provider, audience, response, {
            locale,
            returnTo: query.returnTo,
            intent: intentFromQuery(query.intent, query.token),
        });
    }

    /** Привязать редирект-провайдера к аккаунту сессии; аккаунт едет в подписанном state. */
    link(
        audience: SessionAudience,
        providerKey: string,
        userId: string,
        locale: string | undefined,
        response: Response
    ): void {
        const safeLocale = this.flow.sanitizeLocale(locale);
        const key = this.registry.keyOf(providerKey);
        const provider = this.redirectProvider(audience, key);
        if (!provider) {
            response.redirect(
                this.linkFromRedirect.resultUrl(audience, safeLocale, key, `${key}_off`)
            );
            return;
        }
        this.redirectToProvider(provider, audience, response, {
            locale: safeLocale,
            returnTo: LINK_RETURN_PATH[audience],
            intent: { kind: "link", userId },
        });
    }

    async callback(
        audience: SessionAudience,
        providerKey: string,
        query: OAuthCallbackQuery,
        request: Request,
        response: Response,
        completion: RedirectSignInCompletion
    ): Promise<void> {
        const key = this.registry.keyOf(providerKey);
        let locale = this.flow.sanitizeLocale(undefined);
        // Кука нужна один раз: удаляем её при любом исходе, повторный заход по ссылке не пройдёт
        const flowCookie = (request.cookies as Record<string, string> | undefined)?.[
            OAUTH_FLOW_COOKIE
        ];
        response.clearCookie(OAUTH_FLOW_COOKIE, this.flow.flowCookieOptions(audience, key));
        try {
            const provider = this.registry.redirect(key, audience);
            const verified = this.flow.verifyCallback(audience, key, query.state, flowCookie);
            locale = verified.locale;
            if (query.error || !query.code) throw new OAuthFlowError("provider_error");
            const profile = await this.flow.exchange(
                provider,
                audience,
                query.code,
                verified.binding
            );
            const result = await completion.complete(profile, verified);
            if (result.sessionUserId) {
                await this.startSession(audience, key, result.sessionUserId, request, response);
            }
            response.redirect(result.redirect);
        } catch (error: unknown) {
            this.logger.warn(`${audience} ${key} sign-in rejected: ${this.reasonOf(error)}`);
            response.redirect(this.loginUrl(audience, locale, `${key}_auth`));
        }
    }

    /** Ответ виджета: привязанный способ входит, новый получает билет на шаг почты. */
    async verify(
        audience: SessionAudience,
        providerKey: string,
        payload: Record<string, unknown>,
        request: Request,
        response: Response
    ): Promise<IdentitySignInResultDto> {
        try {
            const provider = this.registry.widget(providerKey, audience);
            const result = await this.signIn.execute(audience, provider.verify(audience, payload));
            if (result.kind === "email_required") {
                return { status: "email_required", ticket: result.ticket };
            }
            await this.startSession(audience, provider.key, result.user.id, request, response);
            return { status: "signed_in" };
        } catch (error: unknown) {
            throw toIdentityHttpError(error);
        }
    }

    async email(
        audience: SessionAudience,
        input: { ticket: string; email: string; language: SupportedLanguage }
    ): Promise<IdentityStatusDto> {
        try {
            await this.requestEmail.execute({ audience, ...input });
            return { status: "email_sent" };
        } catch (error: unknown) {
            throw toIdentityHttpError(error);
        }
    }

    async confirm(
        audience: SessionAudience,
        token: string,
        request: Request,
        response: Response
    ): Promise<IdentityStatusDto> {
        try {
            const { user, provider } = await this.confirmEmail.execute(audience, token);
            await this.startSession(audience, provider, user.id, request, response);
            return { status: "signed_in" };
        } catch (error: unknown) {
            throw toIdentityHttpError(error);
        }
    }

    /** Редирект-провайдер аудитории или `null`, если он не настроен; неизвестный — 404. */
    private redirectProvider(
        audience: SessionAudience,
        providerKey: string
    ): RedirectIdentityProvider | null {
        try {
            return this.registry.redirect(providerKey, audience);
        } catch (error: unknown) {
            if (error instanceof IdentityError && error.reason === "off") return null;
            throw toIdentityHttpError(error);
        }
    }

    private redirectToProvider(
        provider: RedirectIdentityProvider,
        audience: SessionAudience,
        response: Response,
        input: { locale: string; returnTo?: string; intent?: IdentityIntent }
    ): void {
        const { url, cookieValue } = this.flow.start(provider, audience, input);
        response.cookie(
            OAUTH_FLOW_COOKIE,
            cookieValue,
            this.flow.flowCookieOptions(audience, provider.key)
        );
        response.redirect(url);
    }

    private async startSession(
        audience: SessionAudience,
        provider: IdentityProviderKey,
        userId: string,
        request: Request,
        response: Response
    ): Promise<void> {
        await this.sessionHttp.signIn(request, response, { userId, audience, method: provider });
    }

    private reasonOf(error: unknown): string {
        if (error instanceof OAuthFlowError || error instanceof IdentityError) {
            return error.reason;
        }
        return "login_rejected";
    }

    private loginUrl(audience: SessionAudience, locale: string, error: string): string {
        return `${this.flow.frontendUrl(audience)}/${locale}/auth/login?error=${error}`;
    }
}
