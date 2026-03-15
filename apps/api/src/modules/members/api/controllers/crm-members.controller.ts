import {
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    Patch,
    Query,
    StreamableFile,
    UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";

import { MembersService } from "@members/application/services/members.service";
import { StorageService } from "@storage/application/services/storage.service";

import { Public } from "@common/decorators/auth/public.decorator";
import { EmployeeJwtAuthGuard } from "@modules/employees/infrastructure/guards/employee-jwt-auth.guard";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { CrmMemberDto, CrmMemberFullDto, CrmMemberUpdateDto } from "../dto/crm-member.dto";
import { CrmMemberFilesRequestDto } from "../dto/crm-member-documents.dto";

@ApiTags("CRM Members (temporary public)")
@Controller("crm/members")
export class CrmMembersController {
    constructor(
        private readonly membersService: MembersService,
        private readonly storageService: StorageService
    ) { }

    @Get()
    @UseGuards(EmployeeJwtAuthGuard)
    @ApiOperation({ summary: "List members for CRM preview (without authentication)" })
    @ApiQuery({ name: "limit", required: false, type: Number, example: 100 })
    @ApiSuccessResponse(CrmMemberDto, {
        description: "List of members",
        isArray: true,
    })
    @ApiErrorResponse([401, 403, 400])
    async list(@Query("limit") limit?: string): Promise<CrmMemberDto[]> {
        const parsedLimit = Number.parseInt(limit ?? "", 10);
        const take = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 100;
        const members = await this.membersService.findAll(take);

        return members.map((member) => ({
            id: member.id,
            userId: member.userId,
            email: member.user.email,
            name: member.name,
            surname: member.surname ?? null,
            phone: member.phone ?? null,
            status: member.status,
            isActive: member.isActive,
            emailConfirmed: false,
            createdAt: member.createdAt.toISOString(),
        } as CrmMemberDto));
    }

    @Get(":id")
    @Public()
    @ApiOperation({ summary: "Get member details for CRM preview (without authentication)" })
    @ApiSuccessResponse(CrmMemberFullDto, {
        description: "Member details",
    })
    @ApiErrorResponse([401, 403, 400])
    async byId(@Param("id") id: string): Promise<CrmMemberFullDto> {
        const member = await this.membersService.findById(id);

        if (!member) {
            throw new NotFoundException("Member not found");
        }

        return {
            id: member.id,
            userId: member.userId,
            email: member.user.email,
            name: member.name,
            surname: member.surname,
            phone: member.phone,
            birthday: member.birthday?.toISOString() ?? null,
            status: member.status,
            isActive: member.isActive,
            emailConfirmed: false,
            address: member.address,
            membershipNumber: member.membershipNumber,
            notes: member.notes,
            createdAt: member.createdAt.toISOString(),
            updatedAt: member.updatedAt.toISOString(),
            identityDocuments: member.identityDocuments.map((doc) => ({
                id: doc.id,
                type: doc.type,
                side: doc.side,
                storagePath: doc.storagePath,
                createdAt: doc.createdAt.toISOString(),
            })),
            signature: member.signature
                ? {
                    id: member.signature.id,
                    storagePath: member.signature.storagePath,
                    createdAt: member.signature.createdAt.toISOString(),
                }
                : null,
            mjStatuses: member.memberMjStatuses.map((item) => ({
                id: item.mjStatus.id,
                code: item.mjStatus.code,
                name: item.mjStatus.name,
            })),
            documents: member.memberDocuments.map((item) => ({
                id: item.document.id,
                type: item.document.type,
                name: item.document.name,
                number: item.number,
                createdAt: item.createdAt.toISOString(),
            })),
        };
    }

    @Patch(":id")
    @Public()
    @ApiOperation({ summary: "Update member details from CRM (temporary no-auth)" })
    @ApiSuccessResponse(CrmMemberFullDto, {
        description: "Member details",
    })
    @ApiErrorResponse([401, 403, 400])
    async update(
        @Param("id") id: string,
        @Body()
        dto: CrmMemberUpdateDto 
    ) {
        const updated = await this.membersService.updateCrmMember(id, dto);
        if (!updated) {
            throw new NotFoundException("Member not found");
        }
        return this.byId(updated.id);
    }

    @Patch(":id/files")
    @Public()
    @ApiOperation({ summary: "Re-upload member files from CRM (temporary no-auth)" })
    @ApiSuccessResponse(CrmMemberFullDto, {
        description: "Member details",
    })
    @ApiErrorResponse([401, 403, 400])
    async updateFiles(
        @Param("id") id: string,
        @Body()
        dto: CrmMemberFilesRequestDto
    ) {
        const updated = await this.membersService.updateCrmMemberFiles(id, dto);
        if (!updated) {
            throw new NotFoundException("Member not found");
        }
        return this.byId(updated.id);
    }

    @Get(":id/identity-documents/:documentId/preview")
    @Public()
    @ApiOperation({ summary: "Preview identity document image" })
    @ApiSuccessResponse(StreamableFile, {
        description: "Identity document image",
    })
    @ApiErrorResponse([401, 403, 400])
    async identityDocumentPreview(
        @Param("id") memberId: string,
        @Param("documentId") documentId: string
    ): Promise<StreamableFile> {
        const member = await this.membersService.findById(memberId);
        const document = member?.identityDocuments.find((doc) => doc.id === documentId);

        if (!document) {
            throw new NotFoundException("Identity document not found");
        }

        const fileBuffer = await this.storageService.getFile(document.storagePath);
        return new StreamableFile(fileBuffer, {
            type: this.resolveMimeType(document.storagePath),
        });
    }

    @Get(":id/signature/preview")
    @Public()
    @ApiOperation({ summary: "Preview signature image" })
    @ApiSuccessResponse(StreamableFile, {
        description: "Signature image",
    })
    @ApiErrorResponse([401, 403, 400])
    async signaturePreview(@Param("id") memberId: string): Promise<StreamableFile> {
        const member = await this.membersService.findById(memberId);
        if (!member?.signature) {
            throw new NotFoundException("Signature not found");
        }

        const fileBuffer = await this.storageService.getFile(member.signature.storagePath);
        return new StreamableFile(fileBuffer, {
            type: this.resolveMimeType(member.signature.storagePath),
        });
    }

    private resolveMimeType(storagePath: string): string {
        const normalizedPath = storagePath.toLowerCase();
        if (normalizedPath.endsWith(".png")) return "image/png";
        if (normalizedPath.endsWith(".jpg") || normalizedPath.endsWith(".jpeg")) return "image/jpeg";
        if (normalizedPath.endsWith(".webp")) return "image/webp";
        if (normalizedPath.endsWith(".gif")) return "image/gif";
        if (normalizedPath.endsWith(".pdf")) return "application/pdf";
        return "application/octet-stream";
    }
}
