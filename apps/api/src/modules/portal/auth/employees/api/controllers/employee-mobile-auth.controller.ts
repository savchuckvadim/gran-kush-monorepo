import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Headers,
    NotFoundException,
    Post,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { UserRepository } from "@users/domain/repositories/user-repository.interface";

import { resolveDeviceIdFromHeaders } from "@common/auth";
import { CurrentAuthUser } from "@common/decorators/auth/current-auth-user.decorator";
import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { RefreshTokenDto } from "@modules/portal/auth/api/dto/refresh-token.dto";
import { RequireEmployeeUserJwtMobile } from "@modules/portal/auth/employees/api/decorators/require-employee-jwt.decorator";
import { EmployeeAuthResponseDto } from "@modules/portal/auth/employees/api/dto/employee-auth-response.dto";
import { EmployeeLoginDto } from "@modules/portal/auth/employees/api/dto/employee-login.dto";
import { EmployeeLogoutResponseDto } from "@modules/portal/auth/employees/api/dto/employee-logout-response.dto";
import { EmployeeMeResponseDto } from "@modules/portal/auth/employees/api/dto/employee-me-response.dto";
import { EmployeeRefreshTokenResponseDto } from "@modules/portal/auth/employees/api/dto/employee-refresh-token-response.dto";
import { EmployeeAuthService } from "@modules/portal/auth/employees/application/services/employee-auth.service";
import type { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";

@ApiTags("Employee Authentication (CRM Mobile / Native)")
@Controller("crm/mobile/auth")
export class EmployeeMobileAuthController {
    constructor(
        private readonly employeeAuthService: EmployeeAuthService,
        private readonly userRepository: UserRepository
    ) {}

    @Post("login")
    @Public()
    @ApiOperation({ summary: "Login employee (native: Bearer tokens in JSON, no cookies)" })
    @ApiSuccessResponse(EmployeeAuthResponseDto, {
        description: "Employee logged in successfully",
    })
    @ApiErrorResponse([400, 401])
    async login(
        @Body() dto: EmployeeLoginDto,
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
    @RequireEmployeeUserJwtMobile()
    @ApiOperation({ summary: "Get current account with employments (native, global)" })
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
