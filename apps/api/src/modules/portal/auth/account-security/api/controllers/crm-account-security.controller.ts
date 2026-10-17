import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import type { Response } from "express";

import { AUTH_THROTTLE } from "@common/config/throttler/throttler.config";
import { CurrentAuthUser } from "@common/decorators/auth/current-auth-user.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { IdentityVerifyDto } from "@modules/portal/auth/identity/api/dto/identity-auth.dto";
import { CrmSession } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { SESSION_AUDIENCES } from "@modules/portal/auth/sessions/domain/auth-session";
import type { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";

import { AccountSecurityHttpService } from "../account-security-http.service";
import { AccountSecurityDto, ChangeAccountPasswordDto } from "../dto/account-security.dto";

/**
 * «Вход и безопасность» в CRM (TASK-738) — тот же аккаунт и те же правила, что в кабинете; провайдеры —
 * настроенные для CRM. Устройства — `/crm/account/sessions`, привязка редиректом —
 * `GET /crm/auth/{provider}/link`.
 */
@ApiTags("Account (security)")
@Controller("crm/account/security")
@CrmSession()
export class CrmAccountSecurityController {
    constructor(private readonly security: AccountSecurityHttpService) {}

    @Get()
    @ApiOperation({ summary: "Способы входа: задан ли пароль, какие провайдеры привязаны" })
    @ApiSuccessResponse(AccountSecurityDto)
    @ApiErrorResponse([401])
    get(@CurrentAuthUser() user: AuthenticatedUser): Promise<AccountSecurityDto> {
        return this.security.overview(user);
    }

    @Post("sign-out-everywhere")
    @HttpCode(204)
    @ApiOperation({
        summary: "Выйти на всех устройствах",
        description: "Отзывает все сессии аккаунта — в CRM и в кабинете — и снимает куки здесь.",
    })
    @ApiErrorResponse([401])
    signOutEverywhere(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Res({ passthrough: true }) response: Response
    ): Promise<void> {
        return this.security.signOutEverywhere(user, SESSION_AUDIENCES.Crm, response);
    }

    @Put("password")
    @Throttle(AUTH_THROTTLE)
    @ApiOperation({
        summary: "Задать или сменить пароль",
        description:
            "Остальные сессии аккаунта (кабинет и CRM) отзываются, текущая остаётся. " +
            "Неверный текущий пароль — 400 с code `wrong_password`.",
    })
    @ApiSuccessResponse(AccountSecurityDto)
    @ApiErrorResponse([400, 401])
    setPassword(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Body() dto: ChangeAccountPasswordDto
    ): Promise<AccountSecurityDto> {
        return this.security.setPassword(user, dto);
    }

    @Post(":provider")
    @HttpCode(200)
    @Throttle(AUTH_THROTTLE)
    @ApiOperation({
        summary: "Привязать виджет-провайдера (подписанный ответ виджета)",
        description:
            "Способ другого аккаунта — 409 `{provider}_taken`, неверная подпись — 400 `{provider}_signature`.",
    })
    @ApiSuccessResponse(AccountSecurityDto)
    @ApiErrorResponse([400, 401, 404, 409, 503])
    link(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Param("provider") provider: string,
        @Body() dto: IdentityVerifyDto
    ): Promise<AccountSecurityDto> {
        return this.security.linkWidget(user, provider, dto.payload);
    }

    @Delete(":provider")
    @ApiOperation({
        summary: "Отвязать способ входа",
        description: "Последний способ входа не снимается — 409 с code `last_sign_in_method`.",
    })
    @ApiSuccessResponse(AccountSecurityDto)
    @ApiErrorResponse([401, 404, 409])
    unlink(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Param("provider") provider: string
    ): Promise<AccountSecurityDto> {
        return this.security.unlink(user, provider);
    }
}
