import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    NotFoundException,
    Param,
    Post,
    Put,
    Res,
    StreamableFile,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { UserDocument, UserSignature } from "@prisma/client";
import { StorageService } from "@storage/application/services/storage.service";
import type { Response } from "express";

import { UPLOAD_THROTTLE } from "@common/config/throttler/throttler.config";
import { CurrentAuthUser } from "@common/decorators/auth/current-auth-user.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { mimeForStoragePath } from "@common/upload";
import {
    AccountDocumentDto,
    AccountDocumentsResponseDto,
    AccountSignatureDto,
    DeleteAccountDocumentResponseDto,
    ShareWithMembershipDto,
    UploadAccountDocumentDto,
    UploadAccountSignatureDto,
} from "@modules/account/api/dto/account.dto";
import {
    AccountDocumentsService,
    AccountDocumentView,
} from "@modules/account/application/services/account-documents.service";
import { RequireUserJwt } from "@modules/portal/auth/members/api/decorators/require-member-jwt.decorator";
import type { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";

/**
 * «Мой паспорт»: документы и подпись аккаунта. Загрузка клубам ничего не открывает: владелец
 * сам решает, какому клубу что показать, и может отозвать показ в любой момент.
 */
@ApiTags("Account (documents & signature)")
@Controller("cabinet/account")
export class AccountController {
    constructor(
        private readonly accountDocuments: AccountDocumentsService,
        private readonly storageService: StorageService
    ) {}

    @Get("documents")
    @RequireUserJwt()
    @ApiOperation({
        summary: "Мои документы: для каждого — какие клубы его видят; плюс подпись и её показ",
    })
    @ApiSuccessResponse(AccountDocumentsResponseDto)
    @ApiErrorResponse([401])
    async listDocuments(
        @CurrentAuthUser() user: AuthenticatedUser
    ): Promise<AccountDocumentsResponseDto> {
        const [documents, hasSignature, signatureSharedWith] = await Promise.all([
            this.accountDocuments.listDocuments(user.userId),
            this.accountDocuments.hasSignature(user.userId),
            this.accountDocuments.signatureSharedWith(user.userId),
        ]);
        return {
            documents: documents.map((view) => this.toDocumentDto(view)),
            hasSignature,
            signatureSharedWith,
        };
    }

    @Post("documents")
    @RequireUserJwt()
    @Throttle(UPLOAD_THROTTLE)
    @ApiOperation({
        summary:
            "Загрузить или заменить документ (base64 data URL). Клубам ничего не открывает: " +
            "если прежнюю версию уже видит какой-то клуб, он продолжит видеть её",
    })
    @ApiSuccessResponse(AccountDocumentDto)
    @ApiErrorResponse([400, 401])
    async uploadDocument(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Body() dto: UploadAccountDocumentDto
    ): Promise<AccountDocumentDto> {
        const doc = await this.accountDocuments.uploadDocument(user.userId, dto);
        return this.toDocumentDto({ document: doc, sharedWith: [], staleSharedWith: [] });
    }

    @Get("documents/:id/preview")
    @RequireUserJwt()
    @ApiOperation({ summary: "Предпросмотр моего документа" })
    @ApiSuccessResponse(StreamableFile, { description: "Изображение документа" })
    @ApiErrorResponse([401, 403, 404])
    async documentPreview(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Param("id") id: string,
        @Res({ passthrough: true }) res: Response
    ): Promise<StreamableFile> {
        const doc = await this.accountDocuments.getOwnDocument(user.userId, id);
        return this.privateFile(res, doc.storagePath);
    }

    @Delete("documents/:id")
    @RequireUserJwt()
    @ApiOperation({ summary: "Удалить документ вместе со всеми его версиями и показами" })
    @ApiSuccessResponse(DeleteAccountDocumentResponseDto)
    @ApiErrorResponse([401, 403, 404])
    async deleteDocument(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Param("id") id: string
    ): Promise<DeleteAccountDocumentResponseDto> {
        await this.accountDocuments.deleteDocument(user.userId, id);
        return { deleted: true };
    }

    @Post("documents/:id/share")
    @HttpCode(204)
    @RequireUserJwt()
    @ApiOperation({ summary: "Показать документ клубу (членство должно быть подтверждено)" })
    @ApiErrorResponse([400, 401, 403, 404])
    async shareDocument(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Param("id") id: string,
        @Body() dto: ShareWithMembershipDto
    ): Promise<void> {
        await this.accountDocuments.shareDocument(user.userId, id, dto.memberId);
    }

    @Delete("documents/:id/share/:memberId")
    @HttpCode(204)
    @RequireUserJwt()
    @ApiOperation({ summary: "Перестать показывать документ клубу" })
    @ApiErrorResponse([401, 403, 404])
    async revokeDocument(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Param("id") id: string,
        @Param("memberId") memberId: string
    ): Promise<void> {
        await this.accountDocuments.revokeDocument(user.userId, id, memberId);
    }

    @Get("signature")
    @RequireUserJwt()
    @ApiOperation({ summary: "Мета моей подписи" })
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
    @ApiOperation({ summary: "Загрузить или заменить подпись (base64 data URL)" })
    @ApiSuccessResponse(AccountSignatureDto)
    @ApiErrorResponse([400, 401])
    async putSignature(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Body() dto: UploadAccountSignatureDto
    ): Promise<AccountSignatureDto> {
        const signature = await this.accountDocuments.putSignature(user.userId, dto.file);
        return this.toSignatureDto(signature);
    }

    @Get("signature/preview")
    @RequireUserJwt()
    @ApiOperation({ summary: "Предпросмотр моей подписи" })
    @ApiSuccessResponse(StreamableFile, { description: "Изображение подписи" })
    @ApiErrorResponse([401, 404])
    async signaturePreview(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Res({ passthrough: true }) res: Response
    ): Promise<StreamableFile> {
        const signature = await this.accountDocuments.getSignature(user.userId);
        if (!signature) {
            throw new NotFoundException("Signature not found");
        }
        return this.privateFile(res, signature.storagePath);
    }

    @Delete("signature")
    @HttpCode(204)
    @RequireUserJwt()
    @ApiOperation({ summary: "Удалить подпись: показ клубам снимается" })
    @ApiErrorResponse([401])
    async deleteSignature(@CurrentAuthUser() user: AuthenticatedUser): Promise<void> {
        await this.accountDocuments.deleteSignature(user.userId);
    }

    @Post("signature/share")
    @HttpCode(204)
    @RequireUserJwt()
    @ApiOperation({ summary: "Показать подпись клубу (членство должно быть подтверждено)" })
    @ApiErrorResponse([400, 401, 404])
    async shareSignature(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Body() dto: ShareWithMembershipDto
    ): Promise<void> {
        await this.accountDocuments.shareSignature(user.userId, dto.memberId);
    }

    @Delete("signature/share/:memberId")
    @HttpCode(204)
    @RequireUserJwt()
    @ApiOperation({ summary: "Перестать показывать подпись клубу" })
    @ApiErrorResponse([401, 404])
    async revokeSignature(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Param("memberId") memberId: string
    ): Promise<void> {
        await this.accountDocuments.revokeSignature(user.userId, memberId);
    }

    private toDocumentDto(view: AccountDocumentView): AccountDocumentDto {
        const doc: UserDocument = view.document;
        return {
            id: doc.id,
            type: doc.type,
            side: doc.side,
            number: doc.number,
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt.toISOString(),
            sharedWith: view.sharedWith,
            staleSharedWith: view.staleSharedWith,
        };
    }

    private toSignatureDto(signature: UserSignature): AccountSignatureDto {
        return {
            id: signature.id,
            signedAt: signature.signedAt.toISOString(),
            updatedAt: signature.updatedAt.toISOString(),
        };
    }

    /** Удостоверение: не кэшировать и не давать браузеру угадывать тип (как в CRM). */
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
