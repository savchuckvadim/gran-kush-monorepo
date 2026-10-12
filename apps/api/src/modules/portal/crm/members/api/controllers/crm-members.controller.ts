import {
    BadRequestException,
    Body,
    Controller,
    Get,
    HttpCode,
    NotFoundException,
    Param,
    Patch,
    Post,
    Query,
    Res,
    StreamableFile,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { FormPurpose } from "@prisma/client";
import { StorageService } from "@storage/application/services/storage.service";
import { MulterFile } from "@storage/domain/interfaces/storage-file.interface";
import type { Response } from "express";

import { EMAIL_THROTTLE, UPLOAD_THROTTLE } from "@common/config/throttler/throttler.config";
import { CurrentPrincipal } from "@common/decorators/auth/current-principal.decorator";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiPaginatedResponse } from "@common/decorators/response/api-paginated-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { type ContentLocale, RequestLocale } from "@common/i18n";
import { PaginatedResult } from "@common/paginate/interfaces/paginated-result.interface";
import { PaginationUtil } from "@common/paginate/utils/pagination.util";
import type { PortalPrincipal } from "@common/portal";
import { mimeForStoragePath, UPLOAD_LIMITS } from "@common/upload";
import { Admin, AdminGuard, RequireEmployeeJwt } from "@modules/portal/auth/employees";
import { FormSchemaService } from "@modules/portal/crm/entity-fields/application/services/form-schema.service";
import { ENTITY_DEFINITION_CODES } from "@modules/portal/crm/entity-fields/constants/entity-definition-codes";
import {
    CrmCreateMemberDto,
    CrmCreateMemberResponseDto,
} from "@modules/portal/crm/members/api/dto/dynamic-member.dto";
import { MemberConsentService } from "@modules/portal/crm/members/application/services/member-consent.service";
import { MembersService } from "@modules/portal/crm/members/application/services/members.service";

import {
    CrmMemberDto,
    CrmMemberFieldsPatchDto,
    CrmMemberFullDto,
    CrmMemberListQueryDto,
    CrmMemberStatusPatchDto,
} from "../dto/crm-member.dto";
import { CrmMemberFilesRequestDto } from "../dto/crm-member-documents.dto";

@ApiTags("CRM Members Management")
@Controller("crm/members")
@RequireEmployeeJwt()
export class CrmMembersController {
    constructor(
        private readonly membersService: MembersService,
        private readonly memberConsent: MemberConsentService,
        private readonly storageService: StorageService,
        private readonly formSchema: FormSchemaService
    ) {}

    @Post()
    @ApiOperation({
        summary:
            "Create member from CRM (email + dynamic fields; an existing account gets a consent email)",
    })
    @ApiSuccessResponse(CrmCreateMemberResponseDto, { description: "Created member" })
    @ApiErrorResponse([401, 403, 400, 409])
    async create(
        @Body() dto: CrmCreateMemberDto,
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @RequestLocale() locale: ContentLocale
    ): Promise<CrmCreateMemberResponseDto> {
        return this.membersService.createFromCrm(dto, portalId, locale, principal.membershipId);
    }

    @Post(":id/consent/resend")
    @HttpCode(204)
    @Throttle(EMAIL_THROTTLE)
    @ApiOperation({ summary: "Resend the consent email to the account owner (membership pending)" })
    @ApiErrorResponse([400, 401, 403, 404, 429])
    async resendConsent(
        @Param("id") id: string,
        @PortalId() portalId: string,
        @RequestLocale() locale: ContentLocale
    ): Promise<void> {
        await this.memberConsent.resend(id, portalId, locale);
    }

    @Get()
    @ApiOperation({
        summary: "List members for CRM: page, text search `q`, field conditions `filter`, status",
    })
    @ApiPaginatedResponse(CrmMemberDto, { description: "Page of members" })
    @ApiErrorResponse([401, 403, 400])
    async list(
        @PortalId() portalId: string,
        @RequestLocale() locale: ContentLocale,
        @Query() query: CrmMemberListQueryDto
    ): Promise<PaginatedResult<CrmMemberDto>> {
        const { page = 1, limit = 10, q, filter, statusItemId } = query;
        const { items, total } = await this.membersService.findPageByPortal(
            portalId,
            { q, conditions: filter, statusItemId },
            limit,
            PaginationUtil.getSkip(page, limit)
        );

        return PaginationUtil.createPaginatedResult(
            items.map((m) => this.membersService.toCrmMemberListDto(m, locale)),
            total,
            page,
            limit
        );
    }

    @Get("form-schema")
    @ApiOperation({ summary: "Member form schema by purpose (for CRM dynamic forms)" })
    @ApiQuery({ name: "purpose", required: true, enum: FormPurpose })
    @ApiSuccessResponse(Object)
    @ApiErrorResponse([401, 403, 404])
    async memberFormSchema(
        @PortalId() portalId: string,
        @Query("purpose") purposeParam: string,
        @RequestLocale() locale: ContentLocale
    ): Promise<unknown> {
        if (!Object.values(FormPurpose).includes(purposeParam as FormPurpose)) {
            throw new BadRequestException(`Invalid form purpose: ${purposeParam}`);
        }
        return this.formSchema.getFormSchema(
            portalId,
            ENTITY_DEFINITION_CODES.MEMBER,
            purposeParam as FormPurpose,
            locale
        );
    }

    @Get(":id")
    @ApiOperation({ summary: "Get member details for CRM (Employee access required)" })
    @ApiSuccessResponse(CrmMemberFullDto, {
        description: "Member details",
    })
    @ApiErrorResponse([401, 403, 400])
    async byId(
        @Param("id") id: string,
        @PortalId() portalId: string,
        @RequestLocale() locale: ContentLocale
    ): Promise<CrmMemberFullDto> {
        const member = await this.membersService.findByIdForPortal(id, portalId);

        if (!member) {
            throw new NotFoundException("Member not found");
        }

        return this.membersService.toCrmMemberFullDto(member, locale);
    }

    @Patch(":id")
    @UseGuards(AdminGuard)
    @Admin()
    @ApiOperation({ summary: "Update member details from CRM (Admin only)" })
    @ApiSuccessResponse(CrmMemberFullDto, {
        description: "Member details",
    })
    @ApiErrorResponse([401, 403, 400])
    async update(
        @Param("id") id: string,
        @Body() dto: CrmMemberFieldsPatchDto,
        @PortalId() portalId: string,
        @RequestLocale() locale: ContentLocale
    ): Promise<CrmMemberFullDto> {
        const updated = await this.membersService.updateCrmMember(id, portalId, dto);
        if (!updated) {
            throw new NotFoundException("Member not found");
        }
        return this.membersService.toCrmMemberFullDto(updated, locale);
    }

    @Patch(":id/status")
    @UseGuards(AdminGuard)
    @Admin()
    @ApiOperation({ summary: "Change member lifecycle status (Admin only)" })
    @ApiSuccessResponse(CrmMemberFullDto, {
        description: "Member details with updated status",
    })
    @ApiErrorResponse([400, 401, 403, 404])
    async updateStatus(
        @Param("id") id: string,
        @Body() dto: CrmMemberStatusPatchDto,
        @PortalId() portalId: string,
        @RequestLocale() locale: ContentLocale
    ): Promise<CrmMemberFullDto> {
        const updated = await this.membersService.updateMemberStatus(
            id,
            portalId,
            dto.statusItemId
        );
        if (!updated) {
            throw new NotFoundException("Member not found");
        }
        return this.membersService.toCrmMemberFullDto(updated, locale);
    }

    @Patch(":id/files")
    @UseGuards(AdminGuard)
    @Admin()
    @Throttle(UPLOAD_THROTTLE)
    @ApiOperation({ summary: "Re-upload member files from CRM (saved to member account)" })
    @ApiConsumes("multipart/form-data")
    @ApiBody({
        schema: {
            type: "object",
            properties: {
                documentType: { type: "string" },
                documentFirst: { type: "string", format: "binary" },
                documentSecond: { type: "string", format: "binary" },
                signature: { type: "string", format: "binary" },
            },
        },
    })
    @UseInterceptors(
        FileFieldsInterceptor(
            [
                { name: "documentFirst", maxCount: 1 },
                { name: "documentSecond", maxCount: 1 },
                { name: "signature", maxCount: 1 },
            ],
            {
                // Файлы читаются в память целиком: без потолка один запрос съедал бы её всю.
                // Тип и меньший лимит подписи проверяет AccountFilesService по содержимому
                limits: { fileSize: UPLOAD_LIMITS.documentBytes, files: 3, fields: 4 },
            }
        )
    )
    @ApiSuccessResponse(CrmMemberFullDto, {
        description: "Member details",
    })
    @ApiErrorResponse([401, 403, 400, 413])
    async updateFiles(
        @Param("id") id: string,
        @Body()
        dto: CrmMemberFilesRequestDto,
        @UploadedFiles()
        files: {
            documentFirst?: MulterFile[];
            documentSecond?: MulterFile[];
            signature?: MulterFile[];
        },
        @PortalId() portalId: string,
        @RequestLocale() locale: ContentLocale
    ): Promise<CrmMemberFullDto> {
        return this.membersService.updateCrmMemberFiles(id, portalId, dto, files, locale);
    }

    @Get(":id/documents/:documentId/preview")
    @ApiOperation({ summary: "Preview member account document (Employee access required)" })
    @ApiSuccessResponse(StreamableFile, {
        description: "Document image",
    })
    @ApiErrorResponse([401, 403, 404])
    async documentPreview(
        @Param("id") memberId: string,
        @Param("documentId") documentId: string,
        @PortalId() portalId: string,
        @Res({ passthrough: true }) res: Response
    ): Promise<StreamableFile> {
        const document = await this.membersService.getMemberAccountDocument(
            memberId,
            portalId,
            documentId
        );

        return this.privateFile(res, document.storagePath);
    }

    @Get(":id/signature/preview")
    @ApiOperation({ summary: "Preview member signature (Employee access required)" })
    @ApiSuccessResponse(StreamableFile, {
        description: "Signature image",
    })
    @ApiErrorResponse([401, 403, 404])
    async signaturePreview(
        @Param("id") memberId: string,
        @PortalId() portalId: string,
        @Res({ passthrough: true }) res: Response
    ): Promise<StreamableFile> {
        const signature = await this.membersService.getMemberAccountSignature(memberId, portalId);

        return this.privateFile(res, signature.storagePath);
    }

    /**
     * Удостоверение личности: не кэшировать и не давать браузеру угадывать тип.
     * Расширение в хранилище выставлено по сигнатуре при загрузке; неизвестное
     * отдаётся вложением как бинарник.
     */
    private async privateFile(res: Response, storagePath: string): Promise<StreamableFile> {
        const fileBuffer = await this.storageService.getFile(storagePath);
        const type = mimeForStoragePath(storagePath);
        const filename = storagePath.split("/").pop() ?? "file";

        res.setHeader("Cache-Control", "private, no-store");
        res.setHeader("X-Content-Type-Options", "nosniff");

        return new StreamableFile(fileBuffer, {
            type,
            disposition: `${type === "application/octet-stream" ? "attachment" : "inline"}; filename="${filename}"`,
        });
    }
}
