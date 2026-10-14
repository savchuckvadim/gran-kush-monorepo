import { Body, Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { PUBLIC_TOKEN_THROTTLE } from "@common/config/throttler/throttler.config";
import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { type ContentLocale, RequestLocale } from "@common/i18n";

import { RegistrationLinkPresenceService } from "../../application/services/registration-link-presence.service";
import { RegistrationLinksService } from "../../application/services/registration-links.service";
import {
    PublicRegistrationLinkInfoDto,
    RegisterViaLinkDto,
    RegisterViaLinkResponseDto,
    RegistrationLinkPresenceDto,
    RegistrationLinkPresenceResponseDto,
} from "../dto/registration-link.dto";

@ApiTags("Public Registration Links")
@Controller("public/reg-links")
@Public()
export class PublicRegistrationLinksController {
    constructor(
        private readonly registrationLinksService: RegistrationLinksService,
        private readonly presence: RegistrationLinkPresenceService
    ) {}

    @Get(":token")
    @Throttle(PUBLIC_TOKEN_THROTTLE)
    @ApiOperation({ summary: "Портал и схема формы по токену ссылки-регистрации" })
    @ApiSuccessResponse(PublicRegistrationLinkInfoDto)
    @ApiErrorResponse([404])
    async info(
        @Param("token") token: string,
        @RequestLocale() locale: ContentLocale
    ): Promise<PublicRegistrationLinkInfoDto> {
        return this.registrationLinksService.getPublicInfo(token, locale);
    }

    @Post(":token/register")
    @Throttle(PUBLIC_TOKEN_THROTTLE)
    @ApiOperation({
        summary: "Регистрация member по ссылке-форме (создаёт/клеймит аккаунт + вступление)",
    })
    @ApiSuccessResponse(RegisterViaLinkResponseDto, { status: 201 })
    @ApiErrorResponse([400, 404, 409])
    async register(
        @Param("token") token: string,
        @Body() dto: RegisterViaLinkDto,
        @RequestLocale() locale: ContentLocale
    ): Promise<RegisterViaLinkResponseDto> {
        return this.registrationLinksService.registerViaLink(token, dto, locale);
    }

    @Post(":token/ping")
    @HttpCode(200)
    @Throttle(PUBLIC_TOKEN_THROTTLE)
    @ApiOperation({
        summary: "Heartbeat зрителя анкеты: публичная страница шлёт раз в ~30 с, пока открыта",
    })
    @ApiSuccessResponse(RegistrationLinkPresenceResponseDto)
    @ApiErrorResponse([400, 404])
    async ping(
        @Param("token") token: string,
        @Body() dto: RegistrationLinkPresenceDto
    ): Promise<RegistrationLinkPresenceResponseDto> {
        // a dead link cannot have viewers; this also keeps the Redis keyspace to real tokens
        await this.registrationLinksService.getActiveByToken(token);
        return { online: await this.presence.heartbeat(token, dto.viewerId) };
    }

    @Post(":token/leave")
    @HttpCode(200)
    @Throttle(PUBLIC_TOKEN_THROTTLE)
    @ApiOperation({ summary: "Зритель закрыл анкету (beacon при уходе со страницы)" })
    @ApiSuccessResponse(RegistrationLinkPresenceResponseDto)
    @ApiErrorResponse([400])
    async leave(
        @Param("token") token: string,
        @Body() dto: RegistrationLinkPresenceDto
    ): Promise<RegistrationLinkPresenceResponseDto> {
        return { online: await this.presence.leave(token, dto.viewerId) };
    }
}
