import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Post,
    Res,
    StreamableFile,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import type { Response } from "express";

import { CurrentPrincipal } from "@common/decorators/auth/current-principal.decorator";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { RequirePermission } from "@common/decorators/auth/require-permission.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import type { PortalPrincipal } from "@common/portal";
import { BackgroundOperation } from "@modules/operations";
import { CrmAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { PERMISSIONS } from "@modules/portal/crm/access/domain/permissions";

import { EXPORT_QUARTER_REPORT } from "../../application/operations/export-quarter-report.operation-definition";
import {
    ExportQuarterReportUseCase,
    type QuarterReportInput,
} from "../../application/use-cases/export-quarter-report.use-case";
import { QuarterQueryDto } from "../dto/finance-report.dto";
import { ledgerDownload } from "../ledger-download";

/**
 * PDF квартального отчёта для gestor — `finance.admin`, как любая выгрузка: файл собирается в
 * фоне (202 и id операции), скачать его может только автор, пока не истёк срок.
 */
@ApiTags("CRM Finance")
@Controller("crm/finance/reports")
@CrmAuth({ module: "finance" })
@ApiBearerAuth()
export class CrmFinanceReportFilesController {
    constructor(private readonly exportReport: ExportQuarterReportUseCase) {}

    @Post("pdf")
    @RequirePermission(PERMISSIONS.FinanceAdmin)
    @BackgroundOperation(EXPORT_QUARTER_REPORT)
    @ApiOperation({ summary: "Собрать PDF отчёта квартала для gestor (фоновая операция)" })
    @ApiErrorResponse([400, 401, 403])
    startPdf(@Body() body: QuarterQueryDto): QuarterReportInput {
        return { year: body.year, quarter: body.quarter };
    }

    @Get("files/:operationId")
    @RequirePermission(PERMISSIONS.FinanceAdmin)
    @ApiOperation({ summary: "Скачать PDF готовой операции отчёта: только автору, до срока" })
    @ApiSuccessResponse(StreamableFile)
    @ApiErrorResponse([401, 403, 404, 410])
    async download(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Param("operationId", ParseUUIDPipe) operationId: string,
        @Res({ passthrough: true }) res: Response
    ): Promise<StreamableFile> {
        const file = await this.exportReport.download(
            portalId,
            principal.membershipId,
            operationId
        );
        return ledgerDownload(res, file);
    }
}
