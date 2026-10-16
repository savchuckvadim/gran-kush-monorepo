import { Body, Controller, Get, Headers, Param, Post, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { AccountOwnershipService } from "@users/application/services/account-ownership.service";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import type { Response } from "express";

import { AUTH_GLOBAL_SCOPE, resolveDeviceIdFromHeaders } from "@common/auth";
import { PUBLIC_TOKEN_THROTTLE } from "@common/config/throttler/throttler.config";
import { AuthCookieService } from "@common/cookie/services/auth-cookie.service";
import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { type ContentLocale, RequestLocale } from "@common/i18n";

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
        private readonly userRepository: UserRepository,
        private readonly ownership: AccountOwnershipService,
        private readonly cookieService: AuthCookieService
    ) {}

    @Get(":token")
    @Throttle(PUBLIC_TOKEN_THROTTLE)
    @ApiOperation({ summary: "Информация о приглашении по токену" })
    @ApiSuccessResponse(PublicInvitationInfoDto)
    @ApiErrorResponse([404])
    async info(@Param("token") token: string): Promise<PublicInvitationInfoDto> {
        const invitation = await this.invitationsService.getActiveByToken(token);
        const user = await this.userRepository.findByEmail(invitation.email);
        return {
            email: invitation.email,
            role: invitation.role,
            portalSlug: invitation.portal.name,
            portalDisplayName: invitation.portal.displayName,
            accountExists: user !== null && this.ownership.proofMethod(user) === "password",
        };
    }

    @Post(":token/accept")
    @Throttle(PUBLIC_TOKEN_THROTTLE)
    @ApiOperation({
        summary:
            "Принять приглашение: новый аккаунт или существующий с его паролем + Employee. " +
            "Аккаунт без пароля — 409 и письмо, чтобы задать пароль. " +
            "Сессия существующего аккаунта выдаётся HttpOnly-куками, токенов в теле нет",
    })
    @ApiSuccessResponse(AcceptInvitationResponseDto, { status: 201 })
    @ApiErrorResponse([400, 401, 404, 409])
    async accept(
        @Param("token") token: string,
        @Body() dto: AcceptInvitationDto,
        @RequestLocale() locale: ContentLocale,
        @Headers() headers: Record<string, string | string[] | undefined>,
        @Res({ passthrough: true }) response: Response
    ): Promise<AcceptInvitationResponseDto> {
        const deviceId = resolveDeviceIdFromHeaders(headers);
        const result = await this.invitationsService.accept(token, dto, locale, deviceId);
        if (result.tokens) {
            this.cookieService.setAuthCookies(response, AUTH_GLOBAL_SCOPE.CRM, result.tokens);
        }
        return result.response;
    }
}
