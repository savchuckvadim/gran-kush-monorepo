import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { EmployeeAuthResponseDto } from "@employees/api/dto/employee-auth-response.dto";
import { EmployeeLoginDto } from "@employees/api/dto/employee-login.dto";
import { EmployeeLogoutResponseDto } from "@employees/api/dto/employee-logout-response.dto";
import { EmployeeMeResponseDto } from "@employees/api/dto/employee-me-response.dto";
import { EmployeeRefreshTokenResponseDto } from "@employees/api/dto/employee-refresh-token-response.dto";
import { EmployeeAuthService } from "@employees/application/services/employee-auth.service";
import { Employee } from "@employees/domain/entity/employee.entity";
import { EmployeeJwtAuthGuard } from "@employees/infrastructure/guards/employee-jwt-auth.guard";
import { EmployeeLocalAuthGuard } from "@employees/infrastructure/guards/employee-local-auth.guard";

import { CurrentEmployee } from "@common/decorators/auth/current-employee.decorator";
import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { RefreshTokenDto } from "@modules/auth";

@ApiTags("Employee Authentication (CRM)")
@Controller("crm/auth")
export class EmployeeAuthController {
    constructor(private readonly employeeAuthService: EmployeeAuthService) {}

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
        @CurrentEmployee() _employee
    ): Promise<EmployeeAuthResponseDto> {
        return this.employeeAuthService.login(dto);
    }

    @Post("refresh")
    @Public()
    @ApiOperation({ summary: "Refresh access token (CRM)" })
    @ApiSuccessResponse(EmployeeRefreshTokenResponseDto, {
        description: "Token refreshed successfully",
    })
    @ApiErrorResponse([400, 401])
    async refresh(
        @Body() dto: RefreshTokenDto
    ): Promise<EmployeeRefreshTokenResponseDto> {
        return this.employeeAuthService.refreshToken(dto.refreshToken);
    }

    @Post("logout")
    @Public()
    @ApiOperation({ summary: "Logout employee (CRM)" })
    @ApiSuccessResponse(EmployeeLogoutResponseDto, {
        description: "Logged out successfully",
    })
    async logout(@Body() body: { refreshToken: string }): Promise<EmployeeLogoutResponseDto> {
        await this.employeeAuthService.logout(body.refreshToken);
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
            position: emp.position,
            department: emp.department,
            isActive: emp.isActive,
            lastLoginAt: emp.lastLoginAt,
            createdAt: emp.createdAt,
            updatedAt: emp.updatedAt,
        };
    }
}
