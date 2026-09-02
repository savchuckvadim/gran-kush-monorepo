import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { UserDocument, UserSignature } from "@prisma/client";

import { UPLOAD_THROTTLE } from "@common/config/throttler/throttler.config";
import { CurrentAuthUser } from "@common/decorators/auth/current-auth-user.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import {
    AccountDocumentDto,
    AccountDocumentsResponseDto,
    AccountSignatureDto,
    DeleteAccountDocumentResponseDto,
    UploadAccountDocumentDto,
    UploadAccountSignatureDto,
} from "@modules/account/api/dto/account.dto";
import { AccountDocumentsService } from "@modules/account/application/services/account-documents.service";
import { RequireUserJwt } from "@modules/portal/auth/members/api/decorators/require-member-jwt.decorator";
import type { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";

@ApiTags("Account (documents & signature)")
@Controller("lk/account")
export class AccountController {
    constructor(private readonly accountDocuments: AccountDocumentsService) {}

    @Get("documents")
    @RequireUserJwt()
    @ApiOperation({ summary: "List account documents + signature flag" })
    @ApiSuccessResponse(AccountDocumentsResponseDto)
    @ApiErrorResponse([401])
    async listDocuments(
        @CurrentAuthUser() user: AuthenticatedUser
    ): Promise<AccountDocumentsResponseDto> {
        const [documents, hasSignature] = await Promise.all([
            this.accountDocuments.listDocuments(user.userId),
            this.accountDocuments.hasSignature(user.userId),
        ]);
        return {
            documents: documents.map((d) => this.toDocumentDto(d)),
            hasSignature,
        };
    }

    @Post("documents")
    @RequireUserJwt()
    @Throttle(UPLOAD_THROTTLE)
    @ApiOperation({ summary: "Upload/replace account document (base64 data URL)" })
    @ApiSuccessResponse(AccountDocumentDto)
    @ApiErrorResponse([400, 401])
    async uploadDocument(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Body() dto: UploadAccountDocumentDto
    ): Promise<AccountDocumentDto> {
        const doc = await this.accountDocuments.uploadDocument(user.userId, dto);
        return this.toDocumentDto(doc);
    }

    @Delete("documents/:id")
    @RequireUserJwt()
    @ApiOperation({ summary: "Delete account document" })
    @ApiSuccessResponse(DeleteAccountDocumentResponseDto)
    @ApiErrorResponse([401, 403, 404])
    async deleteDocument(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Param("id") id: string
    ): Promise<DeleteAccountDocumentResponseDto> {
        await this.accountDocuments.deleteDocument(user.userId, id);
        return { deleted: true };
    }

    @Get("signature")
    @RequireUserJwt()
    @ApiOperation({ summary: "Get account signature meta" })
    @ApiSuccessResponse(AccountSignatureDto)
    @ApiErrorResponse([401, 404])
    async getSignature(@CurrentAuthUser() user: AuthenticatedUser): Promise<AccountSignatureDto> {
        const signature = await this.accountDocuments.getSignature(user.userId);
        if (!signature) {
            throw new NotFoundException("Signature not found");
        }
        return this.toSignatureDto(signature);
    }

    @Put("signature")
    @RequireUserJwt()
    @Throttle(UPLOAD_THROTTLE)
    @ApiOperation({ summary: "Upload/replace account signature (base64 data URL)" })
    @ApiSuccessResponse(AccountSignatureDto)
    @ApiErrorResponse([400, 401])
    async putSignature(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Body() dto: UploadAccountSignatureDto
    ): Promise<AccountSignatureDto> {
        const signature = await this.accountDocuments.putSignature(user.userId, dto.file);
        return this.toSignatureDto(signature);
    }

    private toDocumentDto(doc: UserDocument): AccountDocumentDto {
        return {
            id: doc.id,
            type: doc.type,
            side: doc.side,
            number: doc.number,
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt.toISOString(),
        };
    }

    private toSignatureDto(signature: UserSignature): AccountSignatureDto {
        return {
            id: signature.id,
            signedAt: signature.signedAt.toISOString(),
            updatedAt: signature.updatedAt.toISOString(),
        };
    }
}
