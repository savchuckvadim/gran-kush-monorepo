import { Body, Controller, Get, HttpCode, Param, Post, Req, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import type { Request, Response } from "express";

import { PUBLIC_TOKEN_THROTTLE } from "@common/config/throttler/throttler.config";
import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { type ContentLocale, RequestLocale } from "@common/i18n";
import { SessionHttpService } from "@modules/portal/auth/sessions/api/session-http.service";
import { SESSION_AUDIENCES } from "@modules/portal/auth/sessions/domain/auth-session";

import { InvitationAcceptanceService } from "../../application/services/invitation-acceptance.service";
import { InvitationsService } from "../../application/services/invitations.service";
import {
    AcceptInvitationDto,
    AcceptInvitationResponseDto,
    PublicInvitationInfoDto,
} from "../dto/invitation.dto";

@ApiTags("Public Employee Invitations")
@Controller("public/invitations")
@Public()
export class PublicInvitationsController {
    constructor(
        private readonly invitationsService: InvitationsService,
        private readonly acceptance: InvitationAcceptanceService,
        private readonly sessionHttp: SessionHttpService
    ) {}

    @Get(":token")
    @Throttle(PUBLIC_TOKEN_THROTTLE)
    @ApiOperation({ summary: "Клуб, роль и состояние аккаунта приглашённого по токену" })
    @ApiSuccessResponse(PublicInvitationInfoDto)
    @ApiErrorResponse([404])
    async info(@Param("token") token: string): Promise<PublicInvitationInfoDto> {
        return this.invitationsService.getPublicInfo(token);
    }

    @Post(":token/accept")
    @HttpCode(200)
    @Throttle(PUBLIC_TOKEN_THROTTLE)
    @ApiOperation({
        summary:
            "Принять приглашение паролем: новый аккаунт задаёт пароль, существующий доказывает себя своим. " +
            "Сессия выдаётся HttpOnly-куками CRM, токенов в теле нет; что произошло — в `outcome`",
    })
    @ApiSuccessResponse(AcceptInvitationResponseDto)
    @ApiErrorResponse([400, 401, 403, 404, 409])
    async accept(
        @Param("token") token: string,
        @Body() dto: AcceptInvitationDto,
        @RequestLocale() locale: ContentLocale,
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response
    ): Promise<AcceptInvitationResponseDto> {
        const result = await this.acceptance.acceptWithPassword(token, dto, locale);
        if (result.sessionUserId) {
            await this.sessionHttp.signIn(request, response, {
                userId: result.sessionUserId,
                audience: SESSION_AUDIENCES.Crm,
                method: "invitation",
            });
        }
        return result.response;
    }
}
