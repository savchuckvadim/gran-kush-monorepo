import { Body, Controller, Get, NotFoundException, Post, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import type { Request } from "express";

import { AUTH_THROTTLE } from "@common/config/throttler/throttler.config";
import { CurrentAuthUser } from "@common/decorators/auth/current-auth-user.decorator";
import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { RefreshTokenDto } from "@modules/portal/auth/api/dto/refresh-token.dto";
import { MemberAuthResponseDto } from "@modules/portal/auth/members/api/dto/member-auth-response.dto";
import { MemberLoginDto } from "@modules/portal/auth/members/api/dto/member-login.dto";
import { MemberLogoutResponseDto } from "@modules/portal/auth/members/api/dto/member-logout-response.dto";
import { MemberMeResponseDto } from "@modules/portal/auth/members/api/dto/member-me-response.dto";
import { MemberRefreshTokenResponseDto } from "@modules/portal/auth/members/api/dto/member-refresh-token-response.dto";
import { MemberAuthService } from "@modules/portal/auth/members/application/services/member-auth.service";
import { CabinetSession } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { SessionHttpService } from "@modules/portal/auth/sessions/api/session-http.service";
import { SessionsService } from "@modules/portal/auth/sessions/application/sessions.service";
import { SESSION_AUDIENCES } from "@modules/portal/auth/sessions/domain/auth-session";
import type { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";

import { toMemberMe } from "../mappers/member-me.mapper";

/** Нативный кабинет: те же сессии, токены в теле ответа и `Authorization: Bearer`, без кук. */
@ApiTags("Cabinet Auth (mobile)")
@Controller("cabinet/mobile/auth")
export class MemberMobileAuthController {
    constructor(
        private readonly memberAuthService: MemberAuthService,
        private readonly userRepository: UserRepository,
        private readonly sessionHttp: SessionHttpService,
        private readonly sessions: SessionsService
    ) {}

    @Post("login")
    @Throttle(AUTH_THROTTLE)
    @Public()
    @ApiOperation({ summary: "Login Member (native: Bearer tokens in JSON)" })
    @ApiSuccessResponse(MemberAuthResponseDto, {
        description: "Member logged in successfully",
    })
    @ApiErrorResponse([400, 401])
    async login(
        @Body() dto: MemberLoginDto,
        @Req() request: Request
    ): Promise<MemberAuthResponseDto> {
        const user = await this.memberAuthService.verifyCredentials(dto);
        const session = await this.sessionHttp.issue(request, {
            userId: user.id,
            audience: SESSION_AUDIENCES.Cabinet,
            method: "password",
        });
        return {
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
            user: { id: user.id, email: user.email },
        };
    }

    @Post("refresh")
    @Throttle(AUTH_THROTTLE)
    @Public()
    @ApiOperation({ summary: "Refresh tokens (native: refresh token in body)" })
    @ApiSuccessResponse(MemberRefreshTokenResponseDto, {
        description: "Token refreshed successfully",
    })
    @ApiErrorResponse([400, 401])
    async refresh(@Body() body: RefreshTokenDto): Promise<MemberRefreshTokenResponseDto> {
        const { accessToken, refreshToken } = await this.sessions.refresh(
            body.refreshToken,
            SESSION_AUDIENCES.Cabinet
        );
        return { accessToken, refreshToken };
    }

    @Post("logout")
    @Throttle(AUTH_THROTTLE)
    @Public()
    @ApiOperation({ summary: "Logout (native)" })
    @ApiSuccessResponse(MemberLogoutResponseDto, {
        description: "Logged out successfully",
    })
    async logout(@Body() body: RefreshTokenDto): Promise<MemberLogoutResponseDto> {
        await this.sessions.endByRefreshToken(body.refreshToken, SESSION_AUDIENCES.Cabinet);
        return { message: "Logged out successfully" };
    }

    @Get("me")
    @CabinetSession()
    @ApiOperation({ summary: "Get current account with memberships (native, global)" })
    @ApiSuccessResponse(MemberMeResponseDto, {
        description: "Current account information",
    })
    @ApiErrorResponse([401])
    async getMe(@CurrentAuthUser() authUser: AuthenticatedUser): Promise<MemberMeResponseDto> {
        const user = await this.userRepository.findByIdWithMemberships(authUser.userId);
        if (!user) {
            throw new NotFoundException("User not found");
        }
        return toMemberMe(user);
    }
}
