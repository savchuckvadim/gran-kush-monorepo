import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Headers,
    Post,
    UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentEmployee } from "@auth/employees/api/decorators/current-employee.decorator";
import { RequireEmployeeJwtMobile } from "@auth/employees/api/decorators/require-employee-jwt.decorator";
import { EmployeeAuthResponseDto } from "@auth/employees/api/dto/employee-auth-response.dto";
import { EmployeeLoginDto } from "@auth/employees/api/dto/employee-login.dto";
import { EmployeeLogoutResponseDto } from "@auth/employees/api/dto/employee-logout-response.dto";
import { EmployeeMeResponseDto } from "@auth/employees/api/dto/employee-me-response.dto";
import { EmployeeRefreshTokenResponseDto } from "@auth/employees/api/dto/employee-refresh-token-response.dto";
import { EmployeeAuthService } from "@auth/employees/application/services/employee-auth.service";
import { EmployeeLocalAuthGuard } from "@auth/employees/infrastructure/guards/employee-local-auth.guard";
import { Employee } from "@employees/domain/entity/employee.entity";

import { resolveDeviceIdFromHeaders } from "@common/auth";
import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { RefreshTokenDto } from "@modules/auth/api/dto/refresh-token.dto";

@ApiTags("Employee Authentication (CRM Mobile / Native)")
@Controller("crm/mobile/auth")
export class EmployeeMobileAuthController {
    constructor(private readonly employeeAuthService: EmployeeAuthService) {}

    @Post("login")
    @Public()
    @UseGuards(EmployeeLocalAuthGuard)
    @ApiOperation({ summary: "Login employee (native: Bearer tokens in JSON, no cookies)" })
    @ApiSuccessResponse(EmployeeAuthResponseDto, {
        description: "Employee logged in successfully",
    })
    @ApiErrorResponse([400, 401])
    async login(
        @Body() dto: EmployeeLoginDto,
        @CurrentEmployee() _employee,
        @Headers() headers: Record<string, string | string[] | undefined>
    ): Promise<EmployeeAuthResponseDto> {
        const deviceId = resolveDeviceIdFromHeaders(headers);
        return this.employeeAuthService.login(dto, deviceId);
    }

    @Post("refresh")
    @Public()
    @ApiOperation({ summary: "Refresh tokens (native: refresh token in body)" })
    @ApiSuccessResponse(EmployeeRefreshTokenResponseDto, {
        description: "Token refreshed successfully",
    })
    @ApiErrorResponse([400, 401])
    async refresh(@Body() body: RefreshTokenDto): Promise<EmployeeRefreshTokenResponseDto> {
        if (!body.refreshToken) {
            throw new BadRequestException("refreshToken is required");
        }
        return this.employeeAuthService.refreshToken(body.refreshToken);
    }

    @Post("logout")
    @Public()
    @ApiOperation({ summary: "Logout (native)" })
    @ApiSuccessResponse(EmployeeLogoutResponseDto, {
        description: "Logged out successfully",
    })
    async logout(@Body() body: RefreshTokenDto): Promise<EmployeeLogoutResponseDto> {
        if (body.refreshToken) {
            await this.employeeAuthService.logout(body.refreshToken);
        }
        return { message: "Logged out successfully" };
    }

    @Get("me")
    @RequireEmployeeJwtMobile()
    @ApiOperation({ summary: "Get current employee (native)" })
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
