import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Headers,
    NotFoundException,
    Post,
    UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentMember } from "@auth/members/api/decorators/current-member.decorator";
import { RequireMemberJwtMobile } from "@auth/members/api/decorators/require-member-jwt.decorator";
import { MemberAuthResponseDto } from "@auth/members/api/dto/member-auth-response.dto";
import { MemberLoginDto } from "@auth/members/api/dto/member-login.dto";
import { MemberLogoutResponseDto } from "@auth/members/api/dto/member-logout-response.dto";
import { MemberMeResponseDto } from "@auth/members/api/dto/member-me-response.dto";
import { MemberRefreshTokenResponseDto } from "@auth/members/api/dto/member-refresh-token-response.dto";
import { MemberAuthService } from "@auth/members/application/services/member-auth.service";
import { MemberLocalAuthGuard } from "@auth/members/infrastructure/guards/member-local-auth.guard";
import { MembersService } from "@members/application/services/members.service";
import { Member } from "@members/domain/entity/member.entity";

import { resolveDeviceIdFromHeaders } from "@common/auth";
import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { RefreshTokenDto } from "@modules/auth/api/dto/refresh-token.dto";

@ApiTags("Member Authentication (Site Mobile / Native)")
@Controller("lk/mobile/auth")
export class MemberMobileAuthController {
    constructor(
        private readonly memberAuthService: MemberAuthService,
        private readonly membersService: MembersService
    ) {}

    @Post("login")
    @Public()
    @UseGuards(MemberLocalAuthGuard)
    @ApiOperation({ summary: "Login Member (native: Bearer tokens in JSON)" })
    @ApiSuccessResponse(MemberAuthResponseDto, {
        description: "Member logged in successfully",
    })
    @ApiErrorResponse([400, 401])
    async login(
        @Body() dto: MemberLoginDto,
        @CurrentMember() _member: Member,
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
    @RequireMemberJwtMobile()
    @ApiOperation({ summary: "Get current Member (native)" })
    @ApiSuccessResponse(MemberMeResponseDto, {
        description: "Current Member information",
    })
    @ApiErrorResponse([401])
    async getMe(@CurrentMember() member: Member): Promise<MemberMeResponseDto> {
        const fullMember = await this.membersService.findByUserId(member.userId);

        if (!fullMember) {
            throw new NotFoundException("Member not found");
        }

        return {
            id: fullMember.user.id,
            email: fullMember.user.email,
            name: fullMember.name,
            phone: fullMember.phone || undefined,
            isActive: fullMember.isActive,
            createdAt: fullMember.createdAt,
            updatedAt: fullMember.updatedAt,
        };
    }
}
