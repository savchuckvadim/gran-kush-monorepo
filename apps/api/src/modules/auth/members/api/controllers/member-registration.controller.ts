import { Body, Controller, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { AllowUnconfirmed } from "@auth/members/api/decorators/allow-unconfirmed.decorator";
import { CheckUserExistsDto } from "@auth/members/api/dto/check-user-exists.dto";
import { CheckUserExistsResponseDto } from "@auth/members/api/dto/check-user-exists-response.dto";
import { RegisterMemberDto, RegisterQueryDto } from "@auth/members/api/dto/register-member.dto";
import { RegisterMemberResponseDto } from "@auth/members/api/dto/register-member-response.dto";
import { MemberRegistrationService } from "@auth/members/application/services/member-registration.service";
import { Member } from "@members/domain/entity/member.entity";

import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { UploadMemberFilesDto } from "@modules/members/api/dto/upload-member-files.dto";
import { UploadMemberFilesResponseDto } from "@modules/members/api/dto/upload-member-files-response.dto";
import { MemberFilesService } from "@modules/members/application/services/member-files.service";

import { MemberRegistrationUseCase } from "../../application/use-cases/member-registration.service";
import { CurrentMember } from "../decorators/current-member.decorator";
import { RequireMemberJwt } from "../decorators/require-member-jwt.decorator";
import {
    MemberConfirmEmailDto,
    MemberConfirmEmailResponseDto,
} from "../dto/member-confirm-email.dto";

@ApiTags("Member Registration (Site)")
@Controller("lk/auth/member")
export class MemberRegistrationController {
    constructor(
        private readonly memberRegistrationUseCase: MemberRegistrationUseCase,
        private readonly memberRegistrationService: MemberRegistrationService,
        private readonly memberFilesService: MemberFilesService
    ) {}

    @Post("check")
    @Public()
    @ApiOperation({ summary: "Check if user exists (for Member registration)" })
    @ApiSuccessResponse(CheckUserExistsResponseDto, {
        description: "User existence check result",
    })
    async checkUserExists(@Body() dto: CheckUserExistsDto): Promise<CheckUserExistsResponseDto> {
        return this.memberRegistrationService.checkUserExists(dto.email);
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
        @Query() query: RegisterQueryDto,
        @PortalId() portalId: string
    ): Promise<RegisterMemberResponseDto> {
        const shouldForce = query.force === "true";
        return this.memberRegistrationUseCase.execute(dto, shouldForce, portalId);
    }

    @Post("files")
    @AllowUnconfirmed()
    @RequireMemberJwt()
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

    @Post("confirm-email")
    @Public()
    @ApiOperation({ summary: "Confirm email" })
    @ApiSuccessResponse(MemberConfirmEmailResponseDto, {
        status: 200,
        description: "Email confirmed successfully",
    })
    @ApiErrorResponse([400, 404, 401])
    async confirmEmail(@Body() dto: MemberConfirmEmailDto): Promise<MemberConfirmEmailResponseDto> {
        return await this.memberRegistrationService.confirmEmail(dto.token);
    }
}
