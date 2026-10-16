import { Body, Controller, Headers, HttpCode, Param, Post, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import type { Response } from "express";

import { AUTH_GLOBAL_SCOPE, resolveDeviceIdFromHeaders } from "@common/auth";
import { PUBLIC_TOKEN_THROTTLE } from "@common/config/throttler/throttler.config";
import { AuthCookieService } from "@common/cookie/services/auth-cookie.service";
import { CurrentAuthUser } from "@common/decorators/auth/current-auth-user.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { RequireUserJwt } from "@modules/portal/auth/members/api/decorators/require-member-jwt.decorator";
import type { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";

import { InvitationAcceptanceService } from "../../application/services/invitation-acceptance.service";
import { AcceptInvitationResponseDto, AcceptInvitationWithSessionDto } from "../dto/invitation.dto";

/**
 * Участник клуба, которого пригласили сотрудником, принимает приглашение сессией кабинета.
 * Сессия CRM выдаётся тому же аккаунту: дальше он работает в CRM как сотрудник.
 */
@ApiTags("Cabinet Invitations")
@Controller("cabinet/invitations")
@RequireUserJwt()
export class CabinetInvitationsController {
    constructor(
        private readonly acceptance: InvitationAcceptanceService,
        private readonly cookieService: AuthCookieService
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
        @Headers() headers: Record<string, string | string[] | undefined>,
        @Res({ passthrough: true }) response: Response
    ): Promise<AcceptInvitationResponseDto> {
        const deviceId = resolveDeviceIdFromHeaders(headers);
        const result = await this.acceptance.acceptWithSession(
            token,
            user.userId,
            dto.fields,
            deviceId
        );
        if (result.tokens) {
            this.cookieService.setAuthCookies(response, AUTH_GLOBAL_SCOPE.CRM, result.tokens);
        }
        return result.response;
    }
}
