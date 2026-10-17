import { Body, Controller, Get, NotFoundException, Post, Req, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import type { Request, Response } from "express";

import { AUTH_THROTTLE, EMAIL_THROTTLE } from "@common/config/throttler/throttler.config";
import { CurrentAuthUser } from "@common/decorators/auth/current-auth-user.decorator";
import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { WebRefreshResponseDto } from "@modules/portal/auth/api/dto/web-refresh-response.dto";
import { MemberLoginDto } from "@modules/portal/auth/members/api/dto/member-login.dto";
import { MemberLogoutResponseDto } from "@modules/portal/auth/members/api/dto/member-logout-response.dto";
import { MemberMeResponseDto } from "@modules/portal/auth/members/api/dto/member-me-response.dto";
import { MemberWebLoginResponseDto } from "@modules/portal/auth/members/api/dto/member-web-login-response.dto";
import { MemberAuthService } from "@modules/portal/auth/members/application/services/member-auth.service";
import { CabinetSession } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { SessionHttpService } from "@modules/portal/auth/sessions/api/session-http.service";
import { SESSION_AUDIENCES } from "@modules/portal/auth/sessions/domain/auth-session";
import { PasswordResetResponseDto } from "@modules/portal/auth/shared/api/dto/password-reset-response.dto";
import { RequestPasswordResetDto } from "@modules/portal/auth/shared/api/dto/request-password-reset.dto";
import { ResetPasswordDto } from "@modules/portal/auth/shared/api/dto/reset-password.dto";
import { EmailVerificationService } from "@modules/portal/auth/shared/application/services/email-verification.service";
import type { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";

import { toMemberMe } from "../mappers/member-me.mapper";

@ApiTags("Cabinet Auth (web)")
@Controller("cabinet/auth")
export class MemberAuthController {
    constructor(
        private readonly memberAuthService: MemberAuthService,
        private readonly userRepository: UserRepository,
        private readonly emailVerificationService: EmailVerificationService,
        private readonly sessionHttp: SessionHttpService
    ) {}

    @Post("login")
    @Throttle(AUTH_THROTTLE)
    @Public()
    @ApiOperation({ summary: "Login Member (site web, HttpOnly cookies)" })
    @ApiSuccessResponse(MemberWebLoginResponseDto, {
        description: "Member logged in successfully",
    })
    @ApiErrorResponse([400, 401])
    async login(
        @Body() dto: MemberLoginDto,
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response
    ): Promise<MemberWebLoginResponseDto> {
        const user = await this.memberAuthService.verifyCredentials(dto);
        const session = await this.sessionHttp.signIn(request, response, {
            userId: user.id,
            audience: SESSION_AUDIENCES.Cabinet,
            method: "password",
        });
        return { user: { id: user.id, email: user.email }, deviceId: session.deviceId };
    }

    @Post("refresh")
    @Throttle(AUTH_THROTTLE)
    @Public()
    @ApiOperation({ summary: "Refresh tokens (cookie refresh only, empty body)" })
    @ApiSuccessResponse(WebRefreshResponseDto, {
        description: "Token refreshed successfully (new pair in HttpOnly cookies only)",
    })
    @ApiErrorResponse([401])
    async refresh(
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response
    ): Promise<WebRefreshResponseDto> {
        await this.sessionHttp.refreshFromCookies(request, response, SESSION_AUDIENCES.Cabinet);
        // Токены в тело не попадают: страница с XSS не должна уметь их читать
        return { refreshed: true };
    }

    @Post("logout")
    @Throttle(AUTH_THROTTLE)
    @Public()
    @ApiOperation({ summary: "Logout Member (site web)" })
    @ApiSuccessResponse(MemberLogoutResponseDto, {
        description: "Logged out successfully",
    })
    async logout(
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response
    ): Promise<MemberLogoutResponseDto> {
        await this.sessionHttp.signOutFromCookies(request, response, SESSION_AUDIENCES.Cabinet);
        return { message: "Logged out successfully" };
    }

    @Get("me")
    @CabinetSession()
    @ApiOperation({ summary: "Get current account with memberships (site web, global)" })
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

    @Post("password/reset")
    @Throttle(EMAIL_THROTTLE)
    @Public()
    @ApiOperation({ summary: "Request password reset (send email with reset link)" })
    @ApiSuccessResponse(PasswordResetResponseDto, {
        description: "Password reset email sent (if email exists)",
    })
    @ApiErrorResponse([400])
    async requestPasswordReset(
        @Body() dto: RequestPasswordResetDto
    ): Promise<PasswordResetResponseDto> {
        return this.emailVerificationService.requestPasswordReset(dto.email, {
            app: "member",
            language: dto.locale,
        });
    }

    @Post("password/reset/confirm")
    @Throttle(AUTH_THROTTLE)
    @Public()
    @ApiOperation({ summary: "Reset password using token from email" })
    @ApiSuccessResponse(PasswordResetResponseDto, {
        description: "Password reset successfully",
    })
    @ApiErrorResponse([400, 404, 401])
    async confirmPasswordReset(@Body() dto: ResetPasswordDto): Promise<PasswordResetResponseDto> {
        return this.emailVerificationService.resetPassword(dto.token, dto.newPassword);
    }
}
