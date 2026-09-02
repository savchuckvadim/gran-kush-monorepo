import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { FormPurpose } from "@prisma/client";
import type { Request } from "express";

import {
    EMAIL_THROTTLE,
    SIGNUP_THROTTLE,
    UPLOAD_THROTTLE,
} from "@common/config/throttler/throttler.config";
import { CurrentAuthUser } from "@common/decorators/auth/current-auth-user.decorator";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { AllowUnconfirmed } from "@modules/portal/auth/members/api/decorators/allow-unconfirmed.decorator";
import { CheckUserExistsDto } from "@modules/portal/auth/members/api/dto/check-user-exists.dto";
import { CheckUserExistsResponseDto } from "@modules/portal/auth/members/api/dto/check-user-exists-response.dto";
import { RegisterMemberResponseDto } from "@modules/portal/auth/members/api/dto/register-member-response.dto";
import { MemberRegistrationService } from "@modules/portal/auth/members/application/services/member-registration.service";
import type { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";
import { FormSchemaService } from "@modules/portal/crm/entity-fields/application/services/form-schema.service";
import { ENTITY_DEFINITION_CODES } from "@modules/portal/crm/entity-fields/constants/entity-definition-codes";
import { DynamicMemberRegistrationDto } from "@modules/portal/crm/members/api/dto/dynamic-member.dto";
import { UploadMemberFilesDto } from "@modules/portal/crm/members/api/dto/upload-member-files.dto";
import { UploadMemberFilesResponseDto } from "@modules/portal/crm/members/api/dto/upload-member-files-response.dto";
import { MemberFilesService } from "@modules/portal/crm/members/application/services/member-files.service";

import { MemberRegistrationUseCase } from "../../application/use-cases/member-registration.service";
import { RequireUserJwt } from "../decorators/require-member-jwt.decorator";
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
        private readonly memberFilesService: MemberFilesService,
        private readonly formSchemaService: FormSchemaService
    ) {}

    @Get("registration-schema")
    @Public()
    @ApiOperation({ summary: "Public schema for dynamic member registration form" })
    @ApiSuccessResponse(Object, { description: "Field definitions for registration" })
    async registrationSchema(@PortalId() portalId: string): Promise<unknown> {
        return this.formSchemaService.getFormSchema(
            portalId,
            ENTITY_DEFINITION_CODES.MEMBER,
            FormPurpose.public_registration
        );
    }

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
    @Throttle(SIGNUP_THROTTLE)
    @Public()
    @ApiOperation({
        summary:
            "Register global member account. If portal context (X-Portal-*) is present — also joins that club.",
    })
    @ApiSuccessResponse(RegisterMemberResponseDto, {
        status: 201,
        description: "Member registered successfully",
    })
    @ApiErrorResponse([400, 409])
    async register(
        @Body() dto: DynamicMemberRegistrationDto,
        @Req() request: Request
    ): Promise<RegisterMemberResponseDto> {
        const portalId = request.portalContext?.portalId;
        return this.memberRegistrationUseCase.execute(dto, portalId);
    }

    @Post("files")
    @AllowUnconfirmed()
    @RequireUserJwt()
    @Throttle(UPLOAD_THROTTLE)
    @ApiOperation({ summary: "Queue account documents/signature upload (Site)" })
    @ApiSuccessResponse(UploadMemberFilesResponseDto, {
        status: 201,
        description: "Files were queued for asynchronous processing",
    })
    @ApiErrorResponse([400, 401])
    async uploadFiles(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Body() dto: UploadMemberFilesDto
    ): Promise<UploadMemberFilesResponseDto> {
        return this.memberFilesService.queueUpload({
            userId: user.userId,
            documentType: dto.documentType,
            documentFirst: dto.documentFirst,
            documentSecond: dto.documentSecond,
            signature: dto.signature,
        });
    }

    @Post("confirm-email")
    @Throttle(EMAIL_THROTTLE)
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
