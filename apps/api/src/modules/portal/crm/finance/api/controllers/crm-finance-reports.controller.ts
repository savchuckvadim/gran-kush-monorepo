import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { RequirePermission } from "@common/decorators/auth/require-permission.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiPaginatedResponse } from "@common/decorators/response/api-paginated-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import type { PaginatedResult } from "@common/paginate/interfaces/paginated-result.interface";
import { PaginationUtil } from "@common/paginate/utils/pagination.util";
import { CrmAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { PERMISSIONS } from "@modules/portal/crm/access/domain/permissions";

import { FinanceReportsService } from "../../application/services/finance-reports.service";
import {
    FormCellEntriesQueryDto,
    FormCellParamsDto,
    PeriodReportDto,
    QuarterQueryDto,
    TaxFormDto,
} from "../dto/finance-report.dto";
import { LedgerEntryDto } from "../dto/ledger-entry.dto";
import { PeriodRangeDto } from "../dto/ledger-query.dto";
import { toPeriodReportDto, toTaxFormDto } from "../mappers/finance-report.mapper";
import { toLedgerEntryDto } from "../mappers/ledger.mapper";

const DEFAULT_PAGE_SIZE = 25;

/** Отчёты учёта (TASK-799): читает тот, кто видит учёт (`finance.read`). */
@ApiTags("CRM Finance")
@Controller("crm/finance/reports")
@CrmAuth({ module: "finance" })
@ApiBearerAuth()
export class CrmFinanceReportsController {
    constructor(private readonly reports: FinanceReportsService) {}

    @Get("period")
    @RequirePermission(PERMISSIONS.FinanceRead)
    @ApiOperation({ summary: "Отчёт за период: IVA по ставкам, удержания IRPF, касса и банк" })
    @ApiSuccessResponse(PeriodReportDto)
    @ApiErrorResponse([400, 401, 403])
    async period(
        @PortalId() portalId: string,
        @Query() query: PeriodRangeDto
    ): Promise<PeriodReportDto> {
        return toPeriodReportDto(await this.reports.period(portalId, query.from, query.to));
    }

    @Get("forms")
    @RequirePermission(PERMISSIONS.FinanceRead)
    @ApiOperation({ summary: "Цифры для форм квартала (303, 130) по профилю организации" })
    @ApiSuccessResponse(TaxFormDto, { isArray: true })
    @ApiErrorResponse([400, 401, 403])
    async forms(
        @PortalId() portalId: string,
        @Query() query: QuarterQueryDto
    ): Promise<TaxFormDto[]> {
        const reports = await this.reports.forms(portalId, query.year, query.quarter);
        return reports.map(toTaxFormDto);
    }

    @Get("forms/:form/cells/:cell/entries")
    @RequirePermission(PERMISSIONS.FinanceRead)
    @ApiOperation({ summary: "Проводки, из которых сложилась ячейка формы, новые сверху" })
    @ApiPaginatedResponse(LedgerEntryDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async cellEntries(
        @PortalId() portalId: string,
        @Param() params: FormCellParamsDto,
        @Query() query: FormCellEntriesQueryDto
    ): Promise<PaginatedResult<LedgerEntryDto>> {
        const { page = 1, limit = DEFAULT_PAGE_SIZE, year, quarter } = query;
        const { items, total } = await this.reports.cellEntries(
            portalId,
            { year, quarter, form: params.form, cell: params.cell },
            { skip: PaginationUtil.getSkip(page, limit), take: limit }
        );
        return PaginationUtil.createPaginatedResult(
            items.map(toLedgerEntryDto),
            total,
            page,
            limit
        );
    }
}
