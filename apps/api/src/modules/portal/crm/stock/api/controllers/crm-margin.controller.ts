import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { RequirePermission } from "@common/decorators/auth/require-permission.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { CrmAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { PERMISSIONS } from "@modules/portal/crm/access/domain/permissions";
import { PeriodRangeDto } from "@modules/portal/crm/finance/api/dto/ledger-query.dto";

import { MarginService } from "../../application/services/margin.service";
import type { MarginRow } from "../../domain/margin";
import { MarginReportDto, MarginRowDto } from "../dto/margin.dto";

const euros = (cents: number): number => cents / 100;

const toRow = (row: MarginRow): MarginRowDto => ({
    ...row,
    revenue: euros(row.revenue),
    cost: row.cost === null ? null : euros(row.cost),
    margin: row.margin === null ? null : euros(row.margin),
});

/** Маржа по товарам (TASK-804) — часть учёта: нужны финансы и `finance.read`. */
@ApiTags("CRM Finance")
@Controller("crm/finance/margin")
@CrmAuth({ module: "finance" })
@RequirePermission(PERMISSIONS.FinanceRead)
@ApiBearerAuth()
export class CrmMarginController {
    constructor(private readonly margin: MarginService) {}

    @Get()
    @ApiOperation({
        summary: "Маржа периода по товарам: выручка без налога минус себестоимость продаж",
    })
    @ApiSuccessResponse(MarginReportDto)
    @ApiErrorResponse([400, 401, 403])
    async report(
        @PortalId() portalId: string,
        @Query() query: PeriodRangeDto
    ): Promise<MarginReportDto> {
        const report = await this.margin.report(portalId, query.from, query.to);
        return {
            from: query.from,
            to: query.to,
            revenue: euros(report.revenue),
            cost: euros(report.cost),
            margin: euros(report.margin),
            revenueWithoutCost: euros(report.revenueWithoutCost),
            byProduct: report.byProduct.map(toRow),
        };
    }
}
