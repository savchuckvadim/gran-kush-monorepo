import { Body, Controller, Post, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { CheckUserExistsDto } from "@members/api/dto/check-user-exists.dto";
import { CheckUserExistsResponseDto } from "@members/api/dto/check-user-exists-response.dto";
import { RegisterMemberDto } from "@members/api/dto/register-member.dto";
import { RegisterMemberResponseDto } from "@members/api/dto/register-member-response.dto";
import { MemberAuthService } from "@members/application/services/member-auth.service";
import { MemberFilesService } from "@members/application/services/member-files.service";
import { MembersService } from "@members/application/services/members.service";
import { Member } from "@members/domain/entity/member.entity";
import { MemberJwtAuthGuard } from "@members/infrastructure/guards/member-jwt-auth.guard";
import { UploadMemberFilesDto } from "@modules/members/api/dto/upload-member-files.dto";
import { UploadMemberFilesResponseDto } from "@modules/members/api/dto/upload-member-files-response.dto";

import { CurrentMember } from "@common/decorators/auth/current-member.decorator";
import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";

@ApiTags("Member Registration (Site)")
@Controller("lk/auth/member")
export class MembersAuthController {
    constructor(
        private readonly membersService: MembersService,
        private readonly memberAuthService: MemberAuthService,
        private readonly memberFilesService: MemberFilesService
    ) {}

    @Post("check")
    @Public()
    @ApiOperation({ summary: "Check if user exists (for Member registration)" })
    @ApiSuccessResponse(CheckUserExistsResponseDto, {
        description: "User existence check result",
    })
    async checkUserExists(@Body() dto: CheckUserExistsDto): Promise<CheckUserExistsResponseDto> {
        return this.membersService.checkUserExists(dto.email);
    }

    @Post("register")
    @Public()
    @ApiOperation({ summary: "Register new Member (Site)" })
    @ApiSuccessResponse(RegisterMemberResponseDto, {
        status: 201,
        description: "Member registered successfully",
    })
    @ApiErrorResponse([400, 409])
    async register(
        @Body() dto: RegisterMemberDto,
        @Query("force") force?: string
    ): Promise<RegisterMemberResponseDto> {
        const shouldForce = force === "true";

        // Создаем Member
        const { userId, memberId } = await this.membersService.createMember(dto, shouldForce);

        // Получаем User и Member для генерации токенов
        const userWithMember = await this.membersService.findByUserId(userId);
        if (!userWithMember) {
            throw new Error("Failed to create member");
        }

        // Генерируем токены
        const tokens = await this.memberAuthService.generateTokens(
            userWithMember,
            userWithMember.user
        );

        // Проверяем, был ли User уже Employee
        const userCheck = await this.membersService.checkUserExists(dto.email);

        return {
            ...tokens,
            memberId,
            user: {
                id: userWithMember.user.id,
                email: userWithMember.user.email,
                name: userWithMember.name,
                // surname: userWithMember.surname,
            },
            warning: userCheck.hasEmployee
                ? {
                      message: userCheck.message || "",
                      hasEmployee: true,
                  }
                : undefined,
        };
    }

    @Post("files")
    @UseGuards(MemberJwtAuthGuard)
    @ApiOperation({ summary: "Queue member documents/signature upload (Site)" })
    @ApiSuccessResponse(UploadMemberFilesResponseDto, {
        status: 201,
        description: "Member files were queued for asynchronous processing",
    })
    @ApiErrorResponse([400, 401])
    async uploadFiles(
        @CurrentMember() member: Member,
        @Body() dto: UploadMemberFilesDto
    ): Promise<UploadMemberFilesResponseDto> {
        return this.memberFilesService.queueUpload({
            memberId: member.id,
            documentType: dto.documentType,
            documentFirst: dto.documentFirst,
            documentSecond: dto.documentSecond,
            signature: dto.signature,
        });
    }
}
