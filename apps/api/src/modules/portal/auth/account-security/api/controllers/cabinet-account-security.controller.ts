import { Body, Controller, Delete, Get, Headers, HttpCode, Post, Put, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import type { Response } from "express";

import { AUTH_GLOBAL_SCOPE, resolveDeviceIdFromHeaders } from "@common/auth";
import { AUTH_THROTTLE } from "@common/config/throttler/throttler.config";
import { AuthCookieService } from "@common/cookie/services/auth-cookie.service";
import { CurrentAuthUser } from "@common/decorators/auth/current-auth-user.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { RequireUserJwt } from "@modules/portal/auth/members/api/decorators/require-member-jwt.decorator";
import { MemberAuthService } from "@modules/portal/auth/members/application/services/member-auth.service";
import type { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";
import { TelegramAuthDto } from "@modules/portal/auth/social/api/dto/telegram-auth.dto";
import { toTelegramHttpError } from "@modules/portal/auth/social/api/telegram-http-error";
import { LinkTelegramUseCase } from "@modules/portal/auth/social/application/use-cases/link-telegram.use-case";

import { AccountSecurityService } from "../../application/services/account-security.service";
import { ChangeAccountPasswordUseCase } from "../../application/use-cases/change-account-password.use-case";
import { UnlinkProviderUseCase } from "../../application/use-cases/unlink-provider.use-case";
import { AccountSecurityDto, ChangeAccountPasswordDto } from "../dto/account-security.dto";

/**
 * Вход и безопасность аккаунта в кабинете (TASK-716): пароль, Google, Telegram, выход со всех
 * устройств. Привязка Google — редиректом `GET /cabinet/auth/google/link` рядом со входом через
 * Google; Telegram присылает подписанный профиль из виджета сюда.
 */
@ApiTags("Account (security)")
@Controller("cabinet/account/security")
@RequireUserJwt()
export class CabinetAccountSecurityController {
    constructor(
        private readonly security: AccountSecurityService,
        private readonly changePassword: ChangeAccountPasswordUseCase,
        private readonly unlinkProvider: UnlinkProviderUseCase,
        private readonly linkTelegram: LinkTelegramUseCase,
        private readonly memberAuth: MemberAuthService,
        private readonly cookies: AuthCookieService
    ) {}

    @Get()
    @ApiOperation({ summary: "Способы входа: задан ли пароль, привязаны ли Google и Telegram" })
    @ApiSuccessResponse(AccountSecurityDto)
    @ApiErrorResponse([401])
    async get(@CurrentAuthUser() user: AuthenticatedUser): Promise<AccountSecurityDto> {
        return this.security.overview(user.userId);
    }

    @Put("password")
    @Throttle(AUTH_THROTTLE)
    @ApiOperation({
        summary: "Задать или сменить пароль",
        description:
            "Все сессии аккаунта (кабинет и CRM) отзываются, это устройство получает новую сессию. " +
            "Неверный текущий пароль — 400 с code `wrong_password`.",
    })
    @ApiSuccessResponse(AccountSecurityDto)
    @ApiErrorResponse([400, 401])
    async setPassword(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Body() dto: ChangeAccountPasswordDto,
        @Headers() headers: Record<string, string | string[] | undefined>,
        @Res({ passthrough: true }) response: Response
    ): Promise<AccountSecurityDto> {
        const account = await this.changePassword.execute({
            userId: user.userId,
            currentPassword: dto.currentPassword,
            newPassword: dto.newPassword,
        });
        const tokens = await this.memberAuth.generateTokens(
            account,
            resolveDeviceIdFromHeaders(headers)
        );
        this.cookies.setAuthCookies(response, AUTH_GLOBAL_SCOPE.SITE, tokens);
        return this.security.overview(user.userId);
    }

    @Delete("google")
    @ApiOperation({
        summary: "Отвязать Google",
        description: "Последний способ входа не снимается — 409 с code `last_sign_in_method`.",
    })
    @ApiSuccessResponse(AccountSecurityDto)
    @ApiErrorResponse([401, 404, 409])
    async unlink(@CurrentAuthUser() user: AuthenticatedUser): Promise<AccountSecurityDto> {
        await this.unlinkProvider.execute(user.userId, "google");
        return this.security.overview(user.userId);
    }

    @Post("telegram")
    @HttpCode(200)
    @Throttle(AUTH_THROTTLE)
    @ApiOperation({
        summary: "Привязать Telegram (подписанный профиль из виджета)",
        description:
            "Telegram другого аккаунта — 409 `telegram_taken`, неверная подпись — 400 `telegram_signature`.",
    })
    @ApiSuccessResponse(AccountSecurityDto)
    @ApiErrorResponse([400, 401, 409, 503])
    async linkTelegramAccount(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Body() dto: TelegramAuthDto
    ): Promise<AccountSecurityDto> {
        try {
            await this.linkTelegram.execute(user.userId, dto);
        } catch (error: unknown) {
            throw toTelegramHttpError(error);
        }
        return this.security.overview(user.userId);
    }

    @Delete("telegram")
    @ApiOperation({
        summary: "Отвязать Telegram",
        description: "Последний способ входа не снимается — 409 с code `last_sign_in_method`.",
    })
    @ApiSuccessResponse(AccountSecurityDto)
    @ApiErrorResponse([401, 404, 409])
    async unlinkTelegramAccount(
        @CurrentAuthUser() user: AuthenticatedUser
    ): Promise<AccountSecurityDto> {
        await this.unlinkProvider.execute(user.userId, "telegram");
        return this.security.overview(user.userId);
    }

    @Post("sign-out-everywhere")
    @HttpCode(204)
    @ApiOperation({
        summary: "Выйти на всех устройствах",
        description: "Отзывает все сессии аккаунта — в кабинете и в CRM — и снимает куки здесь.",
    })
    @ApiErrorResponse([401])
    async signOutEverywhere(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Res({ passthrough: true }) response: Response
    ): Promise<void> {
        await this.security.signOutEverywhere(user.userId);
        this.cookies.clearAuthCookies(response, AUTH_GLOBAL_SCOPE.SITE);
    }
}
