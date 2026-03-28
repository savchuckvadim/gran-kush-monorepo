import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Headers,
    Post,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentEmployee } from "@auth/employees/api/decorators/current-employee.decorator";
import { RequireEmployeeJwt } from "@auth/employees/api/decorators/require-employee-jwt.decorator";
import { EmployeeLoginDto } from "@auth/employees/api/dto/employee-login.dto";
import { EmployeeLogoutResponseDto } from "@auth/employees/api/dto/employee-logout-response.dto";
import { EmployeeMeResponseDto } from "@auth/employees/api/dto/employee-me-response.dto";
import { EmployeeRefreshTokenResponseDto } from "@auth/employees/api/dto/employee-refresh-token-response.dto";
import { EmployeeWebLoginResponseDto } from "@auth/employees/api/dto/employee-web-login-response.dto";
import { EmployeeAuthService } from "@auth/employees/application/services/employee-auth.service";
import { EmployeeLocalAuthGuard } from "@auth/employees/infrastructure/guards/employee-local-auth.guard";
import { Employee } from "@employees/domain/entity/employee.entity";
import type { Request, Response } from "express";

import { AUTH_GLOBAL_SCOPE, resolveDeviceIdFromHeaders } from "@common/auth";
import { AuthCookieService } from "@common/cookie/services/auth-cookie.service";
import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";

@ApiTags("Employee Authentication (CRM Web)")
@Controller("crm/auth")
export class EmployeeAuthController {
    constructor(
        private readonly employeeAuthService: EmployeeAuthService,
        private readonly cookieService: AuthCookieService
    ) {}

    @Post("login")
    @Public()
    @UseGuards(EmployeeLocalAuthGuard)
    @ApiOperation({ summary: "Login employee (CRM web, HttpOnly cookies)" })
    @ApiSuccessResponse(EmployeeWebLoginResponseDto, {
        description: "Employee logged in successfully",
    })
    @ApiErrorResponse([400, 401])
    async login(
        @Body() dto: EmployeeLoginDto,
        @CurrentEmployee() _employee,
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
    @RequireEmployeeJwt()
    @ApiOperation({ summary: "Get current employee (CRM web)" })
    @ApiSuccessResponse(EmployeeMeResponseDto, {
        description: "Current employee information",
    })
    @ApiErrorResponse([401])
    getMe(@CurrentEmployee() employee): EmployeeMeResponseDto {
        const emp = employee as Employee;
        return {
            id: emp.id,
            email: emp.email,
            name: emp.name,
            phone: emp.phone,
            role: emp.role,
            portalId: emp.portalId,
            position: emp.position,
            department: emp.department,
            isActive: emp.isActive,
            lastLoginAt: emp.lastLoginAt,
            createdAt: emp.createdAt,
            updatedAt: emp.updatedAt,
        };
    }
}
