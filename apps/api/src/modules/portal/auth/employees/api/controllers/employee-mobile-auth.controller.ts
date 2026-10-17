import { Body, Controller, Get, NotFoundException, Post, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import type { Request } from "express";

import { AUTH_THROTTLE } from "@common/config/throttler/throttler.config";
import { CurrentAuthUser } from "@common/decorators/auth/current-auth-user.decorator";
import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { RefreshTokenDto } from "@modules/portal/auth/api/dto/refresh-token.dto";
import { EmployeeAuthResponseDto } from "@modules/portal/auth/employees/api/dto/employee-auth-response.dto";
import { EmployeeLoginDto } from "@modules/portal/auth/employees/api/dto/employee-login.dto";
import { EmployeeLogoutResponseDto } from "@modules/portal/auth/employees/api/dto/employee-logout-response.dto";
import { EmployeeMeResponseDto } from "@modules/portal/auth/employees/api/dto/employee-me-response.dto";
import { EmployeeRefreshTokenResponseDto } from "@modules/portal/auth/employees/api/dto/employee-refresh-token-response.dto";
import { EmployeeAuthService } from "@modules/portal/auth/employees/application/services/employee-auth.service";
import { CrmSession } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { SessionHttpService } from "@modules/portal/auth/sessions/api/session-http.service";
import { SessionsService } from "@modules/portal/auth/sessions/application/sessions.service";
import { SESSION_AUDIENCES } from "@modules/portal/auth/sessions/domain/auth-session";
import type { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";

import { toEmployeeInfo } from "../mappers/employee-info.mapper";
import { toEmployeeMe } from "../mappers/employee-me.mapper";

/** Нативный CRM: те же сессии, токены в теле ответа и `Authorization: Bearer`, без кук. */
@ApiTags("Employee Authentication (CRM Mobile / Native)")
@Controller("crm/mobile/auth")
export class EmployeeMobileAuthController {
    constructor(
        private readonly employeeAuthService: EmployeeAuthService,
        private readonly userRepository: UserRepository,
        private readonly sessionHttp: SessionHttpService,
        private readonly sessions: SessionsService
    ) {}

    @Post("login")
    @Throttle(AUTH_THROTTLE)
    @Public()
    @ApiOperation({ summary: "Login employee (native: Bearer tokens in JSON, no cookies)" })
    @ApiSuccessResponse(EmployeeAuthResponseDto, {
        description: "Employee logged in successfully",
    })
    @ApiErrorResponse([400, 401])
    async login(
        @Body() dto: EmployeeLoginDto,
        @Req() request: Request
    ): Promise<EmployeeAuthResponseDto> {
        const user = await this.employeeAuthService.verifyCredentials(dto);
        const session = await this.sessionHttp.issue(request, {
            userId: user.id,
            audience: SESSION_AUDIENCES.Crm,
            method: "password",
        });
        return {
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
            employee: toEmployeeInfo(user),
        };
    }

    @Post("refresh")
    @Throttle(AUTH_THROTTLE)
    @Public()
    @ApiOperation({ summary: "Refresh tokens (native: refresh token in body)" })
    @ApiSuccessResponse(EmployeeRefreshTokenResponseDto, {
        description: "Token refreshed successfully",
    })
    @ApiErrorResponse([400, 401])
    async refresh(@Body() body: RefreshTokenDto): Promise<EmployeeRefreshTokenResponseDto> {
        const { accessToken, refreshToken } = await this.sessions.refresh(
            body.refreshToken,
            SESSION_AUDIENCES.Crm
        );
        return { accessToken, refreshToken };
    }

    @Post("logout")
    @Throttle(AUTH_THROTTLE)
    @Public()
    @ApiOperation({ summary: "Logout (native)" })
    @ApiSuccessResponse(EmployeeLogoutResponseDto, {
        description: "Logged out successfully",
    })
    async logout(@Body() body: RefreshTokenDto): Promise<EmployeeLogoutResponseDto> {
        await this.sessions.endByRefreshToken(body.refreshToken, SESSION_AUDIENCES.Crm);
        return { message: "Logged out successfully" };
    }

    @Get("me")
    @CrmSession()
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
        return toEmployeeMe(user);
    }
}
