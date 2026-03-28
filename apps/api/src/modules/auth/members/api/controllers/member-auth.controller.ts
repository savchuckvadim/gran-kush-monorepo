import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Headers,
    NotFoundException,
    Post,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentMember } from "@auth/members/api/decorators/current-member.decorator";
import { RequireMemberJwt } from "@auth/members/api/decorators/require-member-jwt.decorator";
import { MemberLoginDto } from "@auth/members/api/dto/member-login.dto";
import { MemberLogoutResponseDto } from "@auth/members/api/dto/member-logout-response.dto";
import { MemberMeResponseDto } from "@auth/members/api/dto/member-me-response.dto";
import { MemberRefreshTokenResponseDto } from "@auth/members/api/dto/member-refresh-token-response.dto";
import { MemberWebLoginResponseDto } from "@auth/members/api/dto/member-web-login-response.dto";
import { MemberAuthService } from "@auth/members/application/services/member-auth.service";
import { MemberLocalAuthGuard } from "@auth/members/infrastructure/guards/member-local-auth.guard";
import { PasswordResetResponseDto } from "@auth/shared/api/dto/password-reset-response.dto";
import { RequestPasswordResetDto } from "@auth/shared/api/dto/request-password-reset.dto";
import { ResetPasswordDto } from "@auth/shared/api/dto/reset-password.dto";
import { EmailVerificationService } from "@auth/shared/application/services/email-verification.service";
import { MembersService } from "@members/application/services/members.service";
import { Member } from "@members/domain/entity/member.entity";
import type { Request, Response } from "express";

import { AUTH_GLOBAL_SCOPE, resolveDeviceIdFromHeaders } from "@common/auth";
import { AuthCookieService } from "@common/cookie/services/auth-cookie.service";
import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";

@ApiTags("Member Authentication (Site Web)")
@Controller("lk/auth")
export class MemberAuthController {
    constructor(
        private readonly memberAuthService: MemberAuthService,
        private readonly membersService: MembersService,
        private readonly emailVerificationService: EmailVerificationService,
        private readonly cookieService: AuthCookieService
    ) {}

    @Post("login")
    @Public()
    @UseGuards(MemberLocalAuthGuard)
    @ApiOperation({ summary: "Login Member (site web, HttpOnly cookies)" })
    @ApiSuccessResponse(MemberWebLoginResponseDto, {
        description: "Member logged in successfully",
    })
    @ApiErrorResponse([400, 401])
    async login(
        @Body() dto: MemberLoginDto,
        @CurrentMember() _member: Member,
        @Headers() headers: Record<string, string | string[] | undefined>,
        @Res({ passthrough: true }) response: Response
    ): Promise<MemberWebLoginResponseDto> {
        const deviceId = resolveDeviceIdFromHeaders(headers);
        const authResult = await this.memberAuthService.login(dto, deviceId);
        this.cookieService.setAuthCookies(response, AUTH_GLOBAL_SCOPE.SITE, {
            accessToken: authResult.accessToken,
            refreshToken: authResult.refreshToken,
        });

        return {
            user: authResult.user,
            deviceId,
        };
    }

    @Post("refresh")
    @Public()
    @ApiOperation({ summary: "Refresh tokens (cookie refresh only, empty body)" })
    @ApiSuccessResponse(MemberRefreshTokenResponseDto, {
        description: "Token refreshed successfully",
    })
    @ApiErrorResponse([400, 401])
    async refresh(
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response
    ): Promise<MemberRefreshTokenResponseDto> {
        const tokenFromCookie = this.cookieService.getRefreshTokenFromRequestCookies(
            request.cookies as Record<string, unknown>,
            AUTH_GLOBAL_SCOPE.SITE
        );
        if (!tokenFromCookie) {
            throw new BadRequestException("Refresh token cookie is required");
        }

        const refreshed = await this.memberAuthService.refreshToken(tokenFromCookie);
        this.cookieService.setAuthCookies(response, AUTH_GLOBAL_SCOPE.SITE, {
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
        });

        return refreshed;
    }

    @Post("logout")
    @Public()
    @ApiOperation({ summary: "Logout Member (site web)" })
    @ApiSuccessResponse(MemberLogoutResponseDto, {
        description: "Logged out successfully",
    })
    async logout(
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response
    ): Promise<MemberLogoutResponseDto> {
        const tokenFromCookie = this.cookieService.getRefreshTokenFromRequestCookies(
            request.cookies as Record<string, unknown>,
            AUTH_GLOBAL_SCOPE.SITE
        );
        if (tokenFromCookie) {
            await this.memberAuthService.logout(tokenFromCookie);
        }
        this.cookieService.clearAuthCookies(response, AUTH_GLOBAL_SCOPE.SITE);
        return { message: "Logged out successfully" };
    }

    @Get("me")
    @RequireMemberJwt()
    @ApiOperation({ summary: "Get current Member (site web)" })
    @ApiSuccessResponse(MemberMeResponseDto, {
        description: "Current Member information",
    })
    @ApiErrorResponse([401])
    async getMe(@CurrentMember() member: Member): Promise<MemberMeResponseDto> {
        const fullMember = await this.membersService.findByUserId(member.userId);

        if (!fullMember) {
            throw new NotFoundException("Member not found");
        }

        return {
            id: fullMember.user.id,
            email: fullMember.user.email,
            name: fullMember.name,
            phone: fullMember.phone || undefined,
            isActive: fullMember.isActive,
            createdAt: fullMember.createdAt,
            updatedAt: fullMember.updatedAt,
        };
    }

    @Post("password/reset")
    @Public()
    @ApiOperation({ summary: "Request password reset (send email with reset link)" })
    @ApiSuccessResponse(PasswordResetResponseDto, {
        description: "Password reset email sent (if email exists)",
    })
    @ApiErrorResponse([400])
    async requestPasswordReset(
        @Body() dto: RequestPasswordResetDto
    ): Promise<PasswordResetResponseDto> {
        return this.emailVerificationService.requestPasswordReset(dto.email);
    }

    @Post("password/reset/confirm")
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
