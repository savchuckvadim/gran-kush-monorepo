import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, Res } from "@nestjs/common";
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import type { Request, Response } from "express";

import { AUTH_THROTTLE, EMAIL_THROTTLE } from "@common/config/throttler/throttler.config";
import { CurrentAuthUser } from "@common/decorators/auth/current-auth-user.decorator";
import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { type ContentLocale, RequestLocale } from "@common/i18n";
import { CabinetSession } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { SESSION_AUDIENCES } from "@modules/portal/auth/sessions/domain/auth-session";
import type { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";

import { CabinetIdentitySignInService } from "../../application/services/cabinet-identity-sign-in.service";
import {
    IdentityConfirmDto,
    IdentityEmailDto,
    IdentityLinkQueryDto,
    IdentityProvidersResponseDto,
    IdentitySignInResultDto,
    IdentityStartQueryDto,
    IdentityStatusDto,
    IdentityVerifyDto,
} from "../dto/identity-auth.dto";
import { IdentityHttpService } from "../identity-http.service";

const AUDIENCE = SESSION_AUDIENCES.Cabinet;

/**
 * Способы входа кабинета (AUTH_ARCHITECTURE §6.2): `{provider}` — ключ из реестра (`google`,
 * `telegram`). Редирект-провайдеры — `start`/`callback`, виджеты — `verify`; провайдер без почты
 * проходит шаг `identity/email` и ссылку из письма `identity/confirm`.
 */
@ApiTags("Cabinet Auth (sign-in providers)")
@Controller("cabinet/auth")
export class CabinetIdentityAuthController {
    constructor(
        private readonly identity: IdentityHttpService,
        private readonly completion: CabinetIdentitySignInService
    ) {}

    @Get("providers")
    @Public()
    @ApiOperation({ summary: "Способы входа кабинета и параметры их кнопок" })
    @ApiSuccessResponse(IdentityProvidersResponseDto)
    providers(): IdentityProvidersResponseDto {
        return this.identity.providers(AUDIENCE);
    }

    @Get(":provider/start")
    @Public()
    @Throttle(AUTH_THROTTLE)
    @ApiOperation({ summary: "Начать вход у редирект-провайдера (редирект к провайдеру)" })
    start(
        @Param("provider") provider: string,
        @Query() query: IdentityStartQueryDto,
        @Res() response: Response
    ): void {
        this.identity.start(AUDIENCE, provider, query, response);
    }

    @Get(":provider/link")
    @CabinetSession()
    @Throttle(AUTH_THROTTLE)
    @ApiOperation({ summary: "Привязать редирект-провайдера к своему аккаунту (редирект)" })
    link(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Param("provider") provider: string,
        @Query() query: IdentityLinkQueryDto,
        @Res() response: Response
    ): void {
        this.identity.link(AUDIENCE, provider, user.userId, query.locale, response);
    }

    /**
     * Параметры поштучно, без DTO: провайдер добавляет свои (`scope`, `authuser`, `prompt`…), и
     * строгий ValidationPipe отверг бы возврат целиком.
     */
    @Get(":provider/callback")
    @Public()
    @Throttle(AUTH_THROTTLE)
    @ApiExcludeEndpoint()
    async callback(
        @Param("provider") provider: string,
        @Query("code") code: string | undefined,
        @Query("state") state: string | undefined,
        @Query("error") error: string | undefined,
        @Req() request: Request,
        @Res() response: Response
    ): Promise<void> {
        await this.identity.callback(
            AUDIENCE,
            provider,
            { code, state, error },
            request,
            response,
            this.completion
        );
    }

    @Post(":provider/verify")
    @Public()
    @HttpCode(200)
    @Throttle(AUTH_THROTTLE)
    @ApiOperation({
        summary: "Войти через виджет провайдера",
        description:
            "Привязанный способ входит (куки сессии). Новый без почты — `email_required` с билетом. " +
            "Неверная подпись — 400 `{provider}_signature`.",
    })
    @ApiSuccessResponse(IdentitySignInResultDto)
    @ApiErrorResponse([400, 403, 404, 503])
    verify(
        @Param("provider") provider: string,
        @Body() dto: IdentityVerifyDto,
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response
    ): Promise<IdentitySignInResultDto> {
        return this.identity.verify(AUDIENCE, provider, dto.payload, request, response);
    }

    @Post("identity/email")
    @Public()
    @HttpCode(200)
    @Throttle(EMAIL_THROTTLE)
    @ApiOperation({
        summary: "Шаг «укажите почту»: отправить ссылку подтверждения",
        description:
            "Ответ одинаковый для любого адреса. Устаревший билет — 400 `identity_ticket`.",
    })
    @ApiSuccessResponse(IdentityStatusDto)
    @ApiErrorResponse([400])
    email(
        @Body() dto: IdentityEmailDto,
        @RequestLocale() locale: ContentLocale
    ): Promise<IdentityStatusDto> {
        return this.identity.email(AUDIENCE, {
            ticket: dto.ticket,
            email: dto.email,
            language: locale,
        });
    }

    @Post("identity/confirm")
    @Public()
    @HttpCode(200)
    @Throttle(AUTH_THROTTLE)
    @ApiOperation({
        summary: "Ссылка из письма: войти, заведя аккаунт или привязав способ к существующему",
        description: "Ссылка одноразовая: повтор или устаревшая — 400 `identity_link`.",
    })
    @ApiSuccessResponse(IdentityStatusDto)
    @ApiErrorResponse([400, 403, 409])
    confirm(
        @Body() dto: IdentityConfirmDto,
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response
    ): Promise<IdentityStatusDto> {
        return this.identity.confirm(AUDIENCE, dto.token, request, response);
    }
}
