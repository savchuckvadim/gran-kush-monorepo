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
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import type { Request, Response } from "express";

import { AUTH_GLOBAL_SCOPE, resolveDeviceIdFromHeaders } from "@common/auth";
import { AUTH_THROTTLE, EMAIL_THROTTLE } from "@common/config/throttler/throttler.config";
import { AuthCookieService } from "@common/cookie/services/auth-cookie.service";
import { CurrentAuthUser } from "@common/decorators/auth/current-auth-user.decorator";
import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { WebRefreshResponseDto } from "@modules/portal/auth/api/dto/web-refresh-response.dto";
import { RequireEmployeeUserJwt } from "@modules/portal/auth/employees/api/decorators/require-employee-jwt.decorator";
import { EmployeeLoginDto } from "@modules/portal/auth/employees/api/dto/employee-login.dto";
import { EmployeeLogoutResponseDto } from "@modules/portal/auth/employees/api/dto/employee-logout-response.dto";
import { EmployeeMeResponseDto } from "@modules/portal/auth/employees/api/dto/employee-me-response.dto";
import { EmployeeWebLoginResponseDto } from "@modules/portal/auth/employees/api/dto/employee-web-login-response.dto";
import { EmployeeAuthService } from "@modules/portal/auth/employees/application/services/employee-auth.service";
import { PasswordResetResponseDto } from "@modules/portal/auth/shared/api/dto/password-reset-response.dto";
import { RequestPasswordResetDto } from "@modules/portal/auth/shared/api/dto/request-password-reset.dto";
import {
    ResendEmailConfirmationDto,
    ResendEmailConfirmationPublicDto,
} from "@modules/portal/auth/shared/api/dto/resend-email-confirmation.dto";
import { ResendEmailConfirmationResponseDto } from "@modules/portal/auth/shared/api/dto/resend-email-confirmation-response.dto";
import { ResetPasswordDto } from "@modules/portal/auth/shared/api/dto/reset-password.dto";
import { VerifyEmailDto } from "@modules/portal/auth/shared/api/dto/verify-email.dto";
import { VerifyEmailResponseDto } from "@modules/portal/auth/shared/api/dto/verify-email-response.dto";
import { EmailVerificationService } from "@modules/portal/auth/shared/application/services/email-verification.service";
import type { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";

import { toEmployeeMe } from "../mappers/employee-me.mapper";

@ApiTags("Employee Authentication (CRM Web)")
@Controller("crm/auth")
export class EmployeeAuthController {
    constructor(
        private readonly employeeAuthService: EmployeeAuthService,
        private readonly userRepository: UserRepository,
        private readonly cookieService: AuthCookieService,
        private readonly emailVerificationService: EmailVerificationService
    ) {}

    @Post("login")
    @Throttle(AUTH_THROTTLE)
    @Public()
    @ApiOperation({ summary: "Login employee (CRM web, HttpOnly cookies, global account)" })
    @ApiSuccessResponse(EmployeeWebLoginResponseDto, {
        description: "Employee logged in successfully",
    })
    @ApiErrorResponse([400, 401])
    async login(
        @Body() dto: EmployeeLoginDto,
        @Headers() headers: Record<string, string | string[] | undefined>,
        @Res({ passthrough: true }) response: Response
    ): Promise<EmployeeWebLoginResponseDto> {
        const deviceId = resolveDeviceIdFromHeaders(headers);
        const authResult = await this.employeeAuthService.login(dto, deviceId);
        this.cookieService.setAuthCookies(response, AUTH_GLOBAL_SCOPE.CRM, {
            accessToken: authResult.accessToken,
            refreshToken: authResult.refreshToken,
        });

        return {
            employee: authResult.employee,
            deviceId,
        };
    }

    @Post("refresh")
    @Throttle(AUTH_THROTTLE)
    @Public()
    @ApiOperation({ summary: "Refresh tokens (cookie refresh only, empty body)" })
    @ApiSuccessResponse(WebRefreshResponseDto, {
        description: "Token refreshed successfully (new pair in HttpOnly cookies only)",
    })
    @ApiErrorResponse([400, 401])
    async refresh(
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response
    ): Promise<WebRefreshResponseDto> {
        const tokenFromCookie = this.cookieService.getRefreshTokenFromRequestCookies(
            request.cookies as Record<string, unknown>,
            AUTH_GLOBAL_SCOPE.CRM
        );
        if (!tokenFromCookie) {
            throw new BadRequestException("Refresh token cookie is required");
        }

        const refreshed = await this.employeeAuthService.refreshToken(tokenFromCookie);
        this.cookieService.setAuthCookies(response, AUTH_GLOBAL_SCOPE.CRM, {
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
        });

        // Токены в тело не попадают: страница с XSS не должна уметь их читать
        return { refreshed: true };
    }

    @Post("logout")
    @Throttle(AUTH_THROTTLE)
    @Public()
    @ApiOperation({ summary: "Logout employee (CRM web)" })
    @ApiSuccessResponse(EmployeeLogoutResponseDto, {
        description: "Logged out successfully",
    })
    async logout(
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response
    ): Promise<EmployeeLogoutResponseDto> {
        const tokenFromCookie = this.cookieService.getRefreshTokenFromRequestCookies(
            request.cookies as Record<string, unknown>,
            AUTH_GLOBAL_SCOPE.CRM
        );
        if (tokenFromCookie) {
            await this.employeeAuthService.logout(tokenFromCookie);
        }
        this.cookieService.clearAuthCookies(response, AUTH_GLOBAL_SCOPE.CRM);
        return { message: "Logged out successfully" };
    }

    @Get("me")
    @RequireEmployeeUserJwt()
    @ApiOperation({ summary: "Get current account with employments (CRM web, global)" })
    @ApiSuccessResponse(EmployeeMeResponseDto, {
        description: "Current employee account information",
    })
    @ApiErrorResponse([401])
    async getMe(@CurrentAuthUser() authUser: AuthenticatedUser): Promise<EmployeeMeResponseDto> {
        const user = await this.userRepository.findByIdWithMemberships(authUser.userId);
        if (!user) {
            throw new NotFoundException("User not found");
        }
        return toEmployeeMe(user);
    }

    @Post("password/reset")
    @Throttle(EMAIL_THROTTLE)
    @Public()
    @ApiOperation({ summary: "Request password reset: email with a link to the CRM" })
    @ApiSuccessResponse(PasswordResetResponseDto, {
        description: "Password reset email sent (if email exists)",
    })
    @ApiErrorResponse([400])
    async requestPasswordReset(
        @Body() dto: RequestPasswordResetDto
    ): Promise<PasswordResetResponseDto> {
        return this.emailVerificationService.requestPasswordReset(dto.email, {
            app: "crm",
            language: dto.locale,
        });
    }

    @Post("password/reset/confirm")
    @Throttle(AUTH_THROTTLE)
    @Public()
    @ApiOperation({ summary: "Set a new password using the token from the email" })
    @ApiSuccessResponse(PasswordResetResponseDto, {
        description: "Password reset successfully",
    })
    @ApiErrorResponse([400, 404, 401])
    async confirmPasswordReset(@Body() dto: ResetPasswordDto): Promise<PasswordResetResponseDto> {
        return this.emailVerificationService.resetPassword(dto.token, dto.newPassword);
    }

    @Post("confirm-email")
    @Throttle(AUTH_THROTTLE)
    @Public()
    @ApiOperation({ summary: "Confirm email using the token from the email" })
    @ApiSuccessResponse(VerifyEmailResponseDto, {
        description: "Email confirmed",
    })
    @ApiErrorResponse([400, 404, 401])
    async confirmEmail(@Body() dto: VerifyEmailDto): Promise<VerifyEmailResponseDto> {
        return this.emailVerificationService.verifyEmail(dto.token);
    }

    @Post("confirm-email/resend-public")
    @Throttle(EMAIL_THROTTLE)
    @Public()
    @ApiOperation({
        summary:
            "Resend the confirmation email without a session (public, by email): " +
            "an invited employee cannot sign in before confirming. " +
            "The response never says whether the address is registered",
    })
    @ApiSuccessResponse(ResendEmailConfirmationResponseDto, {
        description: "Letter queued when the address matches an unconfirmed account",
    })
    @ApiErrorResponse([400])
    async resendEmailConfirmationPublic(
        @Body() dto: ResendEmailConfirmationPublicDto
    ): Promise<ResendEmailConfirmationResponseDto> {
        await this.emailVerificationService.resendConfirmationByEmail(dto.email, {
            app: "crm",
            language: dto.locale,
        });
        return { success: true, message: "Confirmation email sent" };
    }

    @Post("confirm-email/resend")
    @Throttle(EMAIL_THROTTLE)
    @RequireEmployeeUserJwt()
    @ApiOperation({ summary: "Send the email confirmation letter to the current account again" })
    @ApiSuccessResponse(ResendEmailConfirmationResponseDto, {
        description: "Letter queued (nothing is sent when the email is already confirmed)",
    })
    @ApiErrorResponse([400, 401])
    async resendEmailConfirmation(
        @CurrentAuthUser() authUser: AuthenticatedUser,
        @Body() dto: ResendEmailConfirmationDto
    ): Promise<ResendEmailConfirmationResponseDto> {
        await this.emailVerificationService.sendVerificationEmailToUserId(authUser.userId, {
            app: "crm",
            language: dto.locale,
        });
        return { success: true, message: "Confirmation email sent" };
    }
}
