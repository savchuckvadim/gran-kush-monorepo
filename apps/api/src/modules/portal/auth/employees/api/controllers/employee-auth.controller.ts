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

import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import type { Request, Response } from "express";

import { AUTH_GLOBAL_SCOPE, resolveDeviceIdFromHeaders } from "@common/auth";
import { AuthCookieService } from "@common/cookie/services/auth-cookie.service";
import { CurrentAuthUser } from "@common/decorators/auth/current-auth-user.decorator";
import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { RequireEmployeeUserJwt } from "@modules/portal/auth/employees/api/decorators/require-employee-jwt.decorator";
import { EmployeeLoginDto } from "@modules/portal/auth/employees/api/dto/employee-login.dto";
import { EmployeeLogoutResponseDto } from "@modules/portal/auth/employees/api/dto/employee-logout-response.dto";
import { EmployeeMeResponseDto } from "@modules/portal/auth/employees/api/dto/employee-me-response.dto";
import { EmployeeRefreshTokenResponseDto } from "@modules/portal/auth/employees/api/dto/employee-refresh-token-response.dto";
import { EmployeeWebLoginResponseDto } from "@modules/portal/auth/employees/api/dto/employee-web-login-response.dto";
import { EmployeeAuthService } from "@modules/portal/auth/employees/application/services/employee-auth.service";
import type { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";

@ApiTags("Employee Authentication (CRM Web)")
@Controller("crm/auth")
export class EmployeeAuthController {
    constructor(
        private readonly employeeAuthService: EmployeeAuthService,
        private readonly userRepository: UserRepository,
        private readonly cookieService: AuthCookieService
    ) {}

    @Post("login")
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
    @Public()
    @ApiOperation({ summary: "Refresh tokens (cookie refresh only, empty body)" })
    @ApiSuccessResponse(EmployeeRefreshTokenResponseDto, {
        description: "Token refreshed successfully",
    })
    @ApiErrorResponse([400, 401])
    async refresh(
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response
    ): Promise<EmployeeRefreshTokenResponseDto> {
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

        return refreshed;
    }

    @Post("logout")
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
        return {
            id: user.id,
            email: user.email,
            employments: user.employees.map((e) => ({
                portalId: e.portalId,
                employeeId: e.id,
                role: e.role,
                isActive: e.isActive,
            })),
        };
    }
}
