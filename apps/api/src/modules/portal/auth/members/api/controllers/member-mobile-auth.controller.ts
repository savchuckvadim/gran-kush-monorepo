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
import { RequireUserJwtMobile } from "@modules/portal/auth/members/api/decorators/require-member-jwt.decorator";
import { MemberAuthResponseDto } from "@modules/portal/auth/members/api/dto/member-auth-response.dto";
import { MemberLoginDto } from "@modules/portal/auth/members/api/dto/member-login.dto";
import { MemberLogoutResponseDto } from "@modules/portal/auth/members/api/dto/member-logout-response.dto";
import { MemberMeResponseDto } from "@modules/portal/auth/members/api/dto/member-me-response.dto";
import { MemberRefreshTokenResponseDto } from "@modules/portal/auth/members/api/dto/member-refresh-token-response.dto";
import { MemberAuthService } from "@modules/portal/auth/members/application/services/member-auth.service";
import type { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";

@ApiTags("Member Authentication (Site Mobile / Native)")
@Controller("lk/mobile/auth")
export class MemberMobileAuthController {
    constructor(
        private readonly memberAuthService: MemberAuthService,
        private readonly userRepository: UserRepository
    ) {}

    @Post("login")
    @Public()
    @ApiOperation({ summary: "Login Member (native: Bearer tokens in JSON)" })
    @ApiSuccessResponse(MemberAuthResponseDto, {
        description: "Member logged in successfully",
    })
    @ApiErrorResponse([400, 401])
    async login(
        @Body() dto: MemberLoginDto,
        @Headers() headers: Record<string, string | string[] | undefined>
    ): Promise<MemberAuthResponseDto> {
        const deviceId = resolveDeviceIdFromHeaders(headers);
        return this.memberAuthService.login(dto, deviceId);
    }

    @Post("refresh")
    @Public()
    @ApiOperation({ summary: "Refresh tokens (native: refresh token in body)" })
    @ApiSuccessResponse(MemberRefreshTokenResponseDto, {
        description: "Token refreshed successfully",
    })
    @ApiErrorResponse([400, 401])
    async refresh(@Body() body: RefreshTokenDto): Promise<MemberRefreshTokenResponseDto> {
        if (!body.refreshToken) {
            throw new BadRequestException("refreshToken is required");
        }
        return this.memberAuthService.refreshToken(body.refreshToken);
    }

    @Post("logout")
    @Public()
    @ApiOperation({ summary: "Logout (native)" })
    @ApiSuccessResponse(MemberLogoutResponseDto, {
        description: "Logged out successfully",
    })
    async logout(@Body() body: RefreshTokenDto): Promise<MemberLogoutResponseDto> {
        if (body.refreshToken) {
            await this.memberAuthService.logout(body.refreshToken);
        }
        return { message: "Logged out successfully" };
    }

    @Get("me")
    @RequireUserJwtMobile()
    @ApiOperation({ summary: "Get current account with memberships (native, global)" })
    @ApiSuccessResponse(MemberMeResponseDto, {
        description: "Current account information",
    })
    @ApiErrorResponse([401])
    async getMe(@CurrentAuthUser() authUser: AuthenticatedUser): Promise<MemberMeResponseDto> {
        const user = await this.userRepository.findByIdWithMemberships(authUser.userId);

        if (!user) {
            throw new NotFoundException("User not found");
        }

        return {
            id: user.id,
            email: user.email,
            emailConfirmed: user.emailConfirmed,
            memberships: user.members.map((m) => ({
                portalId: m.portalId,
                memberId: m.id,
                membershipNumber: m.membershipNumber,
                isActive: m.isActive,
            })),
        };
    }
}
