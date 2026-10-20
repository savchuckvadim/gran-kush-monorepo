import {
    BadRequestException,
    Controller,
    Delete,
    Get,
    Param,
    Put,
    Res,
    StreamableFile,
    UploadedFile,
    UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";

import { MulterFile } from "@storage/domain/interfaces/storage-file.interface";
import type { Response } from "express";

import { CurrentPrincipal } from "@common/decorators/auth/current-principal.decorator";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { RequirePermission } from "@common/decorators/auth/require-permission.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import type { PortalPrincipal } from "@common/portal";
import { CrmAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { PERMISSIONS } from "@modules/portal/crm/access/domain/permissions";

import { LedgerAttachmentsService } from "../../application/services/ledger-attachments.service";
import { LEDGER_ERRORS } from "../../domain/ledger/ledger-entry";
import { FINANCE_LIMITS } from "../../finance.limits";
import { LedgerEntryDto } from "../dto/ledger-entry.dto";
import { ledgerDownload } from "../ledger-download";
import { toLedgerEntryDto } from "../mappers/ledger.mapper";

/** Чек или фактура проводки: файл шифруется ключом портала, отдаётся только с `finance.read`. */
@ApiTags("CRM Finance")
@Controller("crm/finance/entries/:id/attachment")
@CrmAuth({ module: "finance" })
@ApiBearerAuth()
export class CrmLedgerAttachmentsController {
    constructor(private readonly attachments: LedgerAttachmentsService) {}

    @Put()
    @RequirePermission(PERMISSIONS.FinanceWrite)
    @ApiOperation({ summary: "Приложить чек или фактуру: JPEG, PNG, WEBP или PDF" })
    @ApiConsumes("multipart/form-data")
    @ApiBody({
        schema: {
            type: "object",
            required: ["file"],
            properties: { file: { type: "string", format: "binary" } },
        },
    })
    @UseInterceptors(
        FileInterceptor("file", {
            // файл читается в память целиком: потолок не даёт одному запросу съесть её всю
            limits: { fileSize: FINANCE_LIMITS.attachmentBytes, files: 1 },
        })
    )
    @ApiSuccessResponse(LedgerEntryDto)
    @ApiErrorResponse([400, 401, 403, 404, 409, 413])
    async attach(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Param("id") id: string,
        @UploadedFile() file: MulterFile | undefined
    ): Promise<LedgerEntryDto> {
        if (!file) {
            throw new BadRequestException({
                message: "Attach a file",
                code: LEDGER_ERRORS.attachmentMissing,
            });
        }
        return toLedgerEntryDto(
            await this.attachments.attach(portalId, principal.membershipId, id, file)
        );
    }

    @Get()
    @RequirePermission(PERMISSIONS.FinanceRead)
    @ApiOperation({ summary: "Файл вложения (расшифрованный)" })
    @ApiSuccessResponse(StreamableFile)
    @ApiErrorResponse([401, 403, 404])
    async download(
        @PortalId() portalId: string,
        @Param("id") id: string,
        @Res({ passthrough: true }) res: Response
    ): Promise<StreamableFile> {
        const file = await this.attachments.download(portalId, id);
        return ledgerDownload(
            res,
            { body: file.body, contentType: file.mime, fileName: file.name },
            "inline"
        );
    }

    @Delete()
    @RequirePermission(PERMISSIONS.FinanceWrite)
    @ApiOperation({ summary: "Убрать вложение" })
    @ApiSuccessResponse(LedgerEntryDto)
    @ApiErrorResponse([401, 403, 404, 409])
    async remove(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Param("id") id: string
    ): Promise<LedgerEntryDto> {
        return toLedgerEntryDto(
            await this.attachments.remove(portalId, principal.membershipId, id)
        );
    }
}
