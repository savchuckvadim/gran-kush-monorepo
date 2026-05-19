import {
    BadRequestException,
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    Patch,
    Post,
    Query,
    StreamableFile,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";

import { FormPurpose } from "@prisma/client";
import { StorageService } from "@storage/application/services/storage.service";
import { MulterFile } from "@storage/domain/interfaces/storage-file.interface";

import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { Admin, AdminGuard, RequireEmployeeJwt } from "@modules/portal/auth/employees";
import { FormSchemaService } from "@modules/portal/crm/entity-fields/application/services/form-schema.service";
import { ENTITY_DEFINITION_CODES } from "@modules/portal/crm/entity-fields/constants/entity-definition-codes";
import { CrmCreateMemberDto } from "@modules/portal/crm/members/api/dto/dynamic-member.dto";
import { MembersService } from "@modules/portal/crm/members/application/services/members.service";

import { CrmMemberDto, CrmMemberFieldsPatchDto, CrmMemberFullDto } from "../dto/crm-member.dto";
import { CrmMemberFilesRequestDto } from "../dto/crm-member-documents.dto";

@ApiTags("CRM Members Management")
@Controller("crm/members")
@RequireEmployeeJwt()
export class CrmMembersController {
    constructor(
        private readonly membersService: MembersService,
        private readonly storageService: StorageService,
        private readonly formSchema: FormSchemaService
    ) {}

    @Post()
    @ApiOperation({ summary: "Create member from CRM (dynamic fields)" })
    @ApiSuccessResponse(Object, { description: "Created member" })
    @ApiErrorResponse([401, 403, 400, 409])
    async create(
        @Body() dto: CrmCreateMemberDto,
        @PortalId() portalId: string
    ): Promise<CrmMemberFullDto> {
        const { memberId } = await this.membersService.createMemberWithDynamicFields(
            dto,
            false,
            portalId,
            FormPurpose.crm_create
        );
        const member = await this.membersService.findById(memberId);
        if (!member) {
            throw new NotFoundException("Member not found after create");
        }
        return this.membersService.toCrmMemberFullDto(member);
    }

    @Get()
    @ApiOperation({ summary: "List members for CRM (Employee access required)" })
    @ApiQuery({ name: "limit", required: false, type: Number, example: 100 })
    @ApiQuery({ name: "statusItemId", required: false, type: String })
    @ApiQuery({ name: "filterFieldKey", required: false, type: String })
    @ApiQuery({ name: "filterValue", required: false, type: String })
    @ApiSuccessResponse(CrmMemberDto, {
        description: "List of members",
        isArray: true,
    })
    @ApiErrorResponse([401, 403, 400])
    async list(
        @PortalId() portalId: string,
        @Query("limit") limit?: string,
        @Query("statusItemId") statusItemId?: string,
        @Query("filterFieldKey") filterFieldKey?: string,
        @Query("filterValue") filterValue?: string
    ): Promise<CrmMemberDto[]> {
        const parsedLimit = Number.parseInt(limit ?? "", 10);
        const take = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 100;
        const members = await this.membersService.findAll(take, undefined, {
            portalId,
            ...(statusItemId && { statusItemId }),
            ...(filterFieldKey &&
                filterValue !== undefined &&
                filterValue !== "" && { filterFieldKey, filterValue }),
        });

        return members.map((m) => this.membersService.toCrmMemberListDto(m));
    }

    @Get("form-schema")
    @ApiOperation({ summary: "Member form schema by purpose (for CRM dynamic forms)" })
    @ApiQuery({ name: "purpose", required: true, enum: FormPurpose })
    @ApiSuccessResponse(Object)
    @ApiErrorResponse([401, 403, 404])
    async memberFormSchema(
        @PortalId() portalId: string,
        @Query("purpose") purposeParam: string
    ): Promise<unknown> {
        if (!Object.values(FormPurpose).includes(purposeParam as FormPurpose)) {
            throw new BadRequestException(`Invalid form purpose: ${purposeParam}`);
        }
        return this.formSchema.getFormSchema(
            portalId,
            ENTITY_DEFINITION_CODES.MEMBER,
            purposeParam as FormPurpose
        );
    }

    @Get(":id")
    @ApiOperation({ summary: "Get member details for CRM (Employee access required)" })
    @ApiSuccessResponse(CrmMemberFullDto, {
        description: "Member details",
    })
    @ApiErrorResponse([401, 403, 400])
    async byId(@Param("id") id: string): Promise<CrmMemberFullDto> {
        const member = await this.membersService.findById(id);

        if (!member) {
            throw new NotFoundException("Member not found");
        }

        return this.membersService.toCrmMemberFullDto(member);
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
        @Body() dto: CrmMemberFieldsPatchDto
    ): Promise<CrmMemberFullDto> {
        const updated = await this.membersService.updateCrmMember(id, dto);
        if (!updated) {
            throw new NotFoundException("Member not found");
        }
        return this.membersService.toCrmMemberFullDto(updated);
    }

    @Patch(":id/files")
    @UseGuards(AdminGuard)
    @Admin()
    @ApiOperation({ summary: "Re-upload member files from CRM (Admin only)" })
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
        FileFieldsInterceptor([
            { name: "documentFirst", maxCount: 1 },
            { name: "documentSecond", maxCount: 1 },
            { name: "signature", maxCount: 1 },
        ])
    )
    @ApiSuccessResponse(CrmMemberFullDto, {
        description: "Member details",
    })
    @ApiErrorResponse([401, 403, 400])
    async updateFiles(
        @Param("id") id: string,
        @Body()
        dto: CrmMemberFilesRequestDto,
        @UploadedFiles()
        files: {
            documentFirst?: MulterFile[];
            documentSecond?: MulterFile[];
            signature?: MulterFile[];
        }
    ): Promise<CrmMemberFullDto> {
        return this.membersService.updateCrmMemberFiles(id, dto, files);
    }

    @Get(":id/identity-documents/:documentId/preview")
    @ApiOperation({ summary: "Preview identity document image (Employee access required)" })
    @ApiSuccessResponse(StreamableFile, {
        description: "Identity document image",
    })
    @ApiErrorResponse([401, 403, 400])
    async identityDocumentPreview(
        @Param("id") memberId: string,
        @Param("documentId") documentId: string
    ): Promise<StreamableFile> {
        const member = await this.membersService.findById(memberId);
        const document = member?.profile.identityDocuments.find((doc) => doc.id === documentId);

        if (!document) {
            throw new NotFoundException("Identity document not found");
        }

        const fileBuffer = await this.storageService.getFile(document.storagePath);
        return new StreamableFile(fileBuffer, {
            type: this.resolveMimeType(document.storagePath),
        });
    }

    @Get(":id/signature/preview")
    @ApiOperation({ summary: "Preview signature image (Employee access required)" })
    @ApiSuccessResponse(StreamableFile, {
        description: "Signature image",
    })
    @ApiErrorResponse([401, 403, 400])
    async signaturePreview(@Param("id") memberId: string): Promise<StreamableFile> {
        const member = await this.membersService.findById(memberId);
        if (!member?.profile.signature) {
            throw new NotFoundException("Signature not found");
        }

        const fileBuffer = await this.storageService.getFile(member.profile.signature.storagePath);
        return new StreamableFile(fileBuffer, {
            type: this.resolveMimeType(member.profile.signature.storagePath),
        });
    }

    private resolveMimeType(storagePath: string): string {
        const normalizedPath = storagePath.toLowerCase();
        if (normalizedPath.endsWith(".png")) return "image/png";
        if (normalizedPath.endsWith(".jpg") || normalizedPath.endsWith(".jpeg"))
            return "image/jpeg";
        if (normalizedPath.endsWith(".webp")) return "image/webp";
        if (normalizedPath.endsWith(".gif")) return "image/gif";
        if (normalizedPath.endsWith(".pdf")) return "application/pdf";
        return "application/octet-stream";
    }
}
