import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { AuthResponseDto } from "@auth/api/dto/auth-response.dto";
import { LoginDto } from "@auth/api/dto/login.dto";
import { LogoutDto } from "@auth/api/dto/logout.dto";
import { RefreshTokenDto } from "@auth/api/dto/refresh-token.dto";
import { RefreshTokenResponseDto } from "@auth/api/dto/refresh-token-response.dto";
import { UserMeResponseDto } from "@auth/api/dto/user-me-response.dto";
import { MemberAuthService } from "@members/application/services/member-auth.service";
import { MembersService } from "@members/application/services/members.service";
import { Member } from "@members/domain/entity/member.entity";
import { MemberJwtAuthGuard } from "@members/infrastructure/guards/member-jwt-auth.guard";
import { MemberLocalAuthGuard } from "@members/infrastructure/guards/member-local-auth.guard";

import { CurrentMember } from "@common/decorators/auth/current-member.decorator";
import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";

@ApiTags("Member Authentication (Site)")
@Controller("lk/auth")
export class MemberAuthController {
    constructor(
        private readonly memberAuthService: MemberAuthService,
        private readonly membersService: MembersService
    ) {}

    @Post("login")
    @Public()
    @UseGuards(MemberLocalAuthGuard)
    @ApiOperation({ summary: "Login Member (Site)" })
    @ApiSuccessResponse(AuthResponseDto, {
        description: "Member logged in successfully",
    })
    @ApiErrorResponse([400, 401])
    async login(@Body() dto: LoginDto, @CurrentMember() _member: Member): Promise<AuthResponseDto> {
        console.log("login", dto);
        console.log("member", _member);
        return this.memberAuthService.login(dto);
    }

    @Post("refresh")
    @Public()
    @ApiOperation({ summary: "Refresh access token (Site)" })
    @ApiSuccessResponse(RefreshTokenResponseDto, {
        description: "Token refreshed successfully",
    })
    @ApiErrorResponse([400, 401])
    async refresh(@Body() dto: RefreshTokenDto): Promise<{ accessToken: string }> {
        return this.memberAuthService.refreshToken(dto.refreshToken);
    }

    @Post("logout")
    @Public()
    @ApiOperation({ summary: "Logout Member (Site)" })
    @ApiSuccessResponse(LogoutDto, {
        description: "Logged out successfully",
    })
    async logout(@Body() body: { refreshToken: string }): Promise<LogoutDto> {
        await this.memberAuthService.logout(body.refreshToken);
        return { message: "Logged out successfully" };
    }

    @Get("me")
    @UseGuards(MemberJwtAuthGuard)
    @ApiOperation({ summary: "Get current Member (Site)" })
    @ApiSuccessResponse(UserMeResponseDto, {
        description: "Current Member information",
    })
    @ApiErrorResponse([401])
    async getMe(@CurrentMember() member: Member) {
        // Получаем полную информацию Member с User
        const fullMember = await this.membersService.findByUserId(member.userId);

        if (!fullMember) {
            throw new Error("Member not found");
        }

        return {
            id: fullMember.user.id,
            email: fullMember.user.email,
            name: fullMember.name,
            phone: fullMember.phone,
            isActive: fullMember.isActive,
            createdAt: fullMember.createdAt,
            updatedAt: fullMember.updatedAt,
        };
    }
}
