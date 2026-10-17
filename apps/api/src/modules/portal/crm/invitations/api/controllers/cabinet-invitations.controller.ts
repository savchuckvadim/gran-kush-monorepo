import { Body, Controller, HttpCode, Param, Post, Req, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import type { Request, Response } from "express";

import { PUBLIC_TOKEN_THROTTLE } from "@common/config/throttler/throttler.config";
import { CurrentAuthUser } from "@common/decorators/auth/current-auth-user.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { CabinetSession } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { SessionHttpService } from "@modules/portal/auth/sessions/api/session-http.service";
import { SESSION_AUDIENCES } from "@modules/portal/auth/sessions/domain/auth-session";
import type { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";

import { InvitationAcceptanceService } from "../../application/services/invitation-acceptance.service";
import { AcceptInvitationResponseDto, AcceptInvitationWithSessionDto } from "../dto/invitation.dto";

/**
 * Участник клуба, которого пригласили сотрудником, принимает приглашение сессией кабинета.
 * Сессия CRM выдаётся тому же аккаунту: дальше он работает в CRM как сотрудник.
 */
@ApiTags("Cabinet Invitations")
@Controller("cabinet/invitations")
@CabinetSession()
export class CabinetInvitationsController {
    constructor(
        private readonly acceptance: InvitationAcceptanceService,
        private readonly sessionHttp: SessionHttpService
    ) {}

    @Post(":token/accept")
    @HttpCode(200)
    @Throttle(PUBLIC_TOKEN_THROTTLE)
    @ApiOperation({
        summary:
            "Принять приглашение сотрудника сессией кабинета (адрес аккаунта = адрес приглашения)",
    })
    @ApiSuccessResponse(AcceptInvitationResponseDto)
    @ApiErrorResponse([400, 401, 403, 404, 409])
    async accept(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Param("token") token: string,
        @Body() dto: AcceptInvitationWithSessionDto,
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response
    ): Promise<AcceptInvitationResponseDto> {
        const result = await this.acceptance.acceptWithSession(token, user.userId, dto.fields);
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
