import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Post,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentMember } from "@auth/members/api/decorators/current-member.decorator";
import { MemberAuthResponseDto } from "@auth/members/api/dto/member-auth-response.dto";
import { MemberLoginDto } from "@auth/members/api/dto/member-login.dto";
import { MemberLogoutResponseDto } from "@auth/members/api/dto/member-logout-response.dto";
import { MemberMeResponseDto } from "@auth/members/api/dto/member-me-response.dto";
import { MemberRefreshTokenResponseDto } from "@auth/members/api/dto/member-refresh-token-response.dto";
import { MemberAuthService } from "@auth/members/application/services/member-auth.service";
import { MemberJwtAuthGuard } from "@auth/members/infrastructure/guards/member-jwt-auth.guard";
import { MemberLocalAuthGuard } from "@auth/members/infrastructure/guards/member-local-auth.guard";
import { PasswordResetResponseDto } from "@auth/shared/api/dto/password-reset-response.dto";
import { RequestPasswordResetDto } from "@auth/shared/api/dto/request-password-reset.dto";
import { ResetPasswordDto } from "@auth/shared/api/dto/reset-password.dto";
import { AuthCookieService } from "@auth/shared/application/services/auth-cookie.service";
import { AuthSessionService } from "@auth/shared/application/services/auth-session.service";
import { EmailVerificationService } from "@auth/shared/application/services/email-verification.service";
import { MembersService } from "@members/application/services/members.service";
import { Member } from "@members/domain/entity/member.entity";
import type { Request, Response } from "express";

import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { RefreshTokenDto } from "@modules/auth/api/dto/refresh-token.dto";

@ApiTags("Member Authentication (Site)")
@Controller("lk/auth")
export class MemberAuthController {
    constructor(
        private readonly memberAuthService: MemberAuthService,
        private readonly membersService: MembersService,
        private readonly emailVerificationService: EmailVerificationService,
        private readonly cookieService: AuthCookieService,
        private readonly authSessionService: AuthSessionService
    ) {}

    @Post("login")
    @Public()
    @UseGuards(MemberLocalAuthGuard)
    @ApiOperation({ summary: "Login Member (Site)" })
    @ApiSuccessResponse(MemberAuthResponseDto, {
        description: "Member logged in successfully",
    })
    @ApiErrorResponse([400, 401])
    async login(
        @Body() dto: MemberLoginDto,
        @CurrentMember() _member: Member,
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response
    ): Promise<MemberAuthResponseDto> {
        const authResult = await this.memberAuthService.login(dto);
        this.cookieService.setAuthCookies(response, "site", authResult);

        const member = await this.membersService.findByUserId(authResult.user.id);
        if (member?.portalId) {
            await this.authSessionService.createSession({
                portalId: member.portalId,
                userId: authResult.user.id,
                memberId: member.id,
                refreshToken: authResult.refreshToken,
                expiresAt: this.resolveRefreshExpiry(),
                userAgent: request.headers["user-agent"] || null,
                ipAddress: request.ip || null,
            });
        }

        return authResult;
    }

    @Post("refresh")
    @Public()
    @ApiOperation({ summary: "Refresh access token (Site)" })
    @ApiSuccessResponse(MemberRefreshTokenResponseDto, {
        description: "Token refreshed successfully",
    })
    @ApiErrorResponse([400, 401])
    async refresh(
        @Body() dto: RefreshTokenDto,
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response
    ): Promise<MemberRefreshTokenResponseDto> {
        const tokenFromCookie = this.cookieService.getRefreshTokenFromRequestCookies(
            request.cookies as Record<string, unknown>,
            "site"
        );
        const refreshToken = dto.refreshToken || tokenFromCookie;
        if (!refreshToken) {
            throw new BadRequestException("Refresh token is required");
        }

        const refreshed = await this.memberAuthService.refreshToken(refreshToken);
        this.cookieService.setAuthCookies(response, "site", {
            accessToken: refreshed.accessToken,
            refreshToken,
        });

        return refreshed;
    }

    @Post("logout")
    @Public()
    @ApiOperation({ summary: "Logout Member (Site)" })
    @ApiSuccessResponse(MemberLogoutResponseDto, {
        description: "Logged out successfully",
    })
    async logout(
        @Body() body: { refreshToken?: string },
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response
    ): Promise<MemberLogoutResponseDto> {
        const tokenFromCookie = this.cookieService.getRefreshTokenFromRequestCookies(
            request.cookies as Record<string, unknown>,
            "site"
        );
        const refreshToken = body.refreshToken || tokenFromCookie;
        if (refreshToken) {
            await this.memberAuthService.logout(refreshToken);
            await this.authSessionService.revokeByRefreshToken(refreshToken);
        }
        this.cookieService.clearAuthCookies(response, "site");
        return { message: "Logged out successfully" };
    }

    @Get("me")
    @UseGuards(MemberJwtAuthGuard)
    @ApiOperation({ summary: "Get current Member (Site)" })
    @ApiSuccessResponse(MemberMeResponseDto, {
        description: "Current Member information",
    })
    @ApiErrorResponse([401])
    async getMe(@CurrentMember() member: Member): Promise<MemberMeResponseDto> {
        // Получаем полную информацию Member с User
        const fullMember = await this.membersService.findByUserId(member.userId);

        if (!fullMember) {
            throw new Error("Member not found");
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

    private resolveRefreshExpiry(): Date {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        return expiresAt;
    }
}
