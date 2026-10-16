import { Body, Controller, Get, Headers, HttpCode, Post, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import type { Response } from "express";

import { AUTH_GLOBAL_SCOPE, resolveDeviceIdFromHeaders } from "@common/auth";
import { AUTH_THROTTLE, EMAIL_THROTTLE } from "@common/config/throttler/throttler.config";
import { AuthCookieService } from "@common/cookie/services/auth-cookie.service";
import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { type ContentLocale, RequestLocale } from "@common/i18n";
import { MemberAuthService } from "@modules/portal/auth/members/application/services/member-auth.service";
import { TelegramLoginService } from "@modules/portal/auth/social/application/services/telegram-login.service";
import { ConfirmTelegramEmailUseCase } from "@modules/portal/auth/social/application/use-cases/confirm-telegram-email.use-case";
import { RequestTelegramEmailUseCase } from "@modules/portal/auth/social/application/use-cases/request-telegram-email.use-case";
import { SignInWithTelegramUseCase } from "@modules/portal/auth/social/application/use-cases/sign-in-with-telegram.use-case";

import {
    TelegramAuthDto,
    TelegramConfigDto,
    TelegramConfirmDto,
    TelegramEmailDto,
    TelegramSignInResultDto,
    TelegramStatusDto,
} from "../dto/telegram-auth.dto";
import { toTelegramHttpError } from "../telegram-http-error";

type RequestHeaders = Record<string, string | string[] | undefined>;

/**
 * Вход в кабинет через Telegram Login. Виджет на странице входа присылает подписанный профиль;
 * привязанный Telegram входит сразу, новый проходит шаг «укажите почту» и ссылку из письма.
 * Правила сценариев — в use cases; здесь только HTTP и куки сессии.
 */
@ApiTags("Cabinet Auth (web)")
@Controller("cabinet/auth/telegram")
export class MemberTelegramAuthController {
    constructor(
        private readonly telegram: TelegramLoginService,
        private readonly signInWithTelegram: SignInWithTelegramUseCase,
        private readonly requestEmail: RequestTelegramEmailUseCase,
        private readonly confirmEmail: ConfirmTelegramEmailUseCase,
        private readonly memberAuth: MemberAuthService,
        private readonly cookies: AuthCookieService
    ) {}

    @Get("config")
    @Public()
    @ApiOperation({ summary: "Настроен ли вход через Telegram и имя бота для виджета" })
    @ApiSuccessResponse(TelegramConfigDto)
    config(): TelegramConfigDto {
        return this.telegram.config();
    }

    @Post()
    @Public()
    @HttpCode(200)
    @Throttle(AUTH_THROTTLE)
    @ApiOperation({
        summary: "Войти через Telegram",
        description:
            "Привязанный Telegram входит (куки сессии). Новый — `email_required` с билетом на шаг " +
            "«укажите почту». Неверная подпись — 400 `telegram_signature`.",
    })
    @ApiSuccessResponse(TelegramSignInResultDto)
    @ApiErrorResponse([400, 403, 503])
    async signIn(
        @Body() dto: TelegramAuthDto,
        @Headers() headers: RequestHeaders,
        @Res({ passthrough: true }) response: Response
    ): Promise<TelegramSignInResultDto> {
        try {
            const result = await this.signInWithTelegram.execute(dto);
            if (result.kind === "email_required") {
                return { status: "email_required", ticket: result.ticket };
            }
            await this.startSession(result.user, headers, response);
            return { status: "signed_in" };
        } catch (error: unknown) {
            throw toTelegramHttpError(error);
        }
    }

    @Post("email")
    @Public()
    @HttpCode(200)
    @Throttle(EMAIL_THROTTLE)
    @ApiOperation({
        summary: "Шаг «укажите почту»: отправить ссылку подтверждения",
        description:
            "Ответ одинаковый для любого адреса. Устаревший билет — 400 `telegram_ticket`.",
    })
    @ApiSuccessResponse(TelegramStatusDto)
    @ApiErrorResponse([400, 503])
    async email(
        @Body() dto: TelegramEmailDto,
        @RequestLocale() locale: ContentLocale
    ): Promise<TelegramStatusDto> {
        try {
            await this.requestEmail.execute({
                ticket: dto.ticket,
                email: dto.email,
                language: locale,
            });
            return { status: "email_sent" };
        } catch (error: unknown) {
            throw toTelegramHttpError(error);
        }
    }

    @Post("confirm")
    @Public()
    @HttpCode(200)
    @Throttle(AUTH_THROTTLE)
    @ApiOperation({
        summary: "Ссылка из письма: войти, заведя аккаунт или привязав Telegram к существующему",
    })
    @ApiSuccessResponse(TelegramStatusDto)
    @ApiErrorResponse([400, 403, 409])
    async confirm(
        @Body() dto: TelegramConfirmDto,
        @Headers() headers: RequestHeaders,
        @Res({ passthrough: true }) response: Response
    ): Promise<TelegramStatusDto> {
        try {
            const user = await this.confirmEmail.execute(dto.token);
            await this.startSession(user, headers, response);
            return { status: "signed_in" };
        } catch (error: unknown) {
            throw toTelegramHttpError(error);
        }
    }

    private async startSession(
        user: { id: string; email: string },
        headers: RequestHeaders,
        response: Response
    ): Promise<void> {
        const tokens = await this.memberAuth.generateTokens(
            { id: user.id, email: user.email },
            resolveDeviceIdFromHeaders(headers)
        );
        this.cookies.setAuthCookies(response, AUTH_GLOBAL_SCOPE.SITE, tokens);
    }
}
