import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { PasswordResetResponseDto } from "@auth/shared/api/dto/password-reset-response.dto";
import { RequestPasswordResetDto } from "@auth/shared/api/dto/request-password-reset.dto";
import { ResetPasswordDto } from "@auth/shared/api/dto/reset-password.dto";
import { VerifyEmailDto } from "@auth/shared/api/dto/verify-email.dto";
import { VerifyEmailResponseDto } from "@auth/shared/api/dto/verify-email-response.dto";
import { EmailVerificationService } from "@auth/shared/application/services/email-verification.service";

import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";

@ApiTags("Email Verification & Password Reset")
@Controller("auth")
@Public()
export class EmailVerificationController {
    constructor(private readonly emailVerificationService: EmailVerificationService) {}

    @Get("verify/:token")
    @ApiOperation({ summary: "Verify email by token (GET redirect from email link)" })
    @ApiSuccessResponse(VerifyEmailResponseDto, {
        description: "Email verified successfully",
    })
    @ApiErrorResponse([400, 404, 401])
    async verifyEmailGet(@Param("token") token: string): Promise<VerifyEmailResponseDto> {
        return this.emailVerificationService.verifyEmail(token);
    }

    @Post("verify")
    @ApiOperation({ summary: "Verify email by token (POST)" })
    @ApiSuccessResponse(VerifyEmailResponseDto, {
        description: "Email verified successfully",
    })
    @ApiErrorResponse([400, 404, 401])
    async verifyEmailPost(@Body() dto: VerifyEmailDto): Promise<VerifyEmailResponseDto> {
        return this.emailVerificationService.verifyEmail(dto.token);
    }

    @Post("password/reset/request")
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

    @Post("password/reset")
    @ApiOperation({ summary: "Reset password using token from email" })
    @ApiSuccessResponse(PasswordResetResponseDto, {
        description: "Password reset successfully",
    })
    @ApiErrorResponse([400, 404, 401])
    async resetPassword(@Body() dto: ResetPasswordDto): Promise<PasswordResetResponseDto> {
        return this.emailVerificationService.resetPassword(dto.token, dto.newPassword);
    }
}
