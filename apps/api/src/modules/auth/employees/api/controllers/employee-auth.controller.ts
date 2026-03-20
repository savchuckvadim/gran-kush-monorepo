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

import { CurrentEmployee } from "@auth/employees/api/decorators/current-employee.decorator";
import { EmployeeAuthResponseDto } from "@auth/employees/api/dto/employee-auth-response.dto";
import { EmployeeLoginDto } from "@auth/employees/api/dto/employee-login.dto";
import { EmployeeLogoutResponseDto } from "@auth/employees/api/dto/employee-logout-response.dto";
import { EmployeeMeResponseDto } from "@auth/employees/api/dto/employee-me-response.dto";
import { EmployeeRefreshTokenResponseDto } from "@auth/employees/api/dto/employee-refresh-token-response.dto";
import { EmployeeAuthService } from "@auth/employees/application/services/employee-auth.service";
import { EmployeeJwtAuthGuard } from "@auth/employees/infrastructure/guards/employee-jwt-auth.guard";
import { EmployeeLocalAuthGuard } from "@auth/employees/infrastructure/guards/employee-local-auth.guard";
import { AuthCookieService } from "@auth/shared/application/services/auth-cookie.service";
import { AuthSessionService } from "@auth/shared/application/services/auth-session.service";
import { Employee } from "@employees/domain/entity/employee.entity";
import type { Request, Response } from "express";

import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { RefreshTokenDto } from "@modules/auth/api/dto/refresh-token.dto";

@ApiTags("Employee Authentication (CRM)")
@Controller("crm/auth")
export class EmployeeAuthController {
    constructor(
        private readonly employeeAuthService: EmployeeAuthService,
        private readonly cookieService: AuthCookieService,
        private readonly authSessionService: AuthSessionService
    ) {}

    @Post("login")
    @Public()
    @UseGuards(EmployeeLocalAuthGuard)
    @ApiOperation({ summary: "Login employee (CRM)" })
    @ApiSuccessResponse(EmployeeAuthResponseDto, {
        description: "Employee logged in successfully",
    })
    @ApiErrorResponse([400, 401])
    async login(
        @Body() dto: EmployeeLoginDto,
        @CurrentEmployee() _employee,
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response
    ): Promise<EmployeeAuthResponseDto> {
        const authResult = await this.employeeAuthService.login(dto);
        this.cookieService.setAuthCookies(response, "crm", authResult);

        if (authResult.employee.portalId) {
            await this.authSessionService.createSession({
                portalId: authResult.employee.portalId,
                employeeId: authResult.employee.id,
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
    @ApiOperation({ summary: "Refresh access token (CRM)" })
    @ApiSuccessResponse(EmployeeRefreshTokenResponseDto, {
        description: "Token refreshed successfully",
    })
    @ApiErrorResponse([400, 401])
    async refresh(
        @Body() dto: RefreshTokenDto,
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response
    ): Promise<EmployeeRefreshTokenResponseDto> {
        const tokenFromCookie = this.cookieService.getRefreshTokenFromRequestCookies(
            request.cookies as Record<string, unknown>,
            "crm"
        );
        const refreshToken = dto.refreshToken || tokenFromCookie;
        if (!refreshToken) {
            throw new BadRequestException("Refresh token is required");
        }

        const refreshed = await this.employeeAuthService.refreshToken(refreshToken);
        this.cookieService.setAuthCookies(response, "crm", {
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
        });

        return refreshed;
    }

    @Post("logout")
    @Public()
    @ApiOperation({ summary: "Logout employee (CRM)" })
    @ApiSuccessResponse(EmployeeLogoutResponseDto, {
        description: "Logged out successfully",
    })
    async logout(
        @Body() body: { refreshToken?: string },
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response
    ): Promise<EmployeeLogoutResponseDto> {
        const tokenFromCookie = this.cookieService.getRefreshTokenFromRequestCookies(
            request.cookies as Record<string, unknown>,
            "crm"
        );
        const refreshToken = body.refreshToken || tokenFromCookie;
        if (refreshToken) {
            await this.employeeAuthService.logout(refreshToken);
            await this.authSessionService.revokeByRefreshToken(refreshToken);
        }
        this.cookieService.clearAuthCookies(response, "crm");
        return { message: "Logged out successfully" };
    }

    @Get("me")
    @UseGuards(EmployeeJwtAuthGuard)
    @ApiOperation({ summary: "Get current employee (CRM)" })
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

    private resolveRefreshExpiry(): Date {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        return expiresAt;
    }
}
