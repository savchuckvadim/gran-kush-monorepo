import { Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentPrincipal } from "@common/decorators/auth/current-principal.decorator";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { RequirePermission } from "@common/decorators/auth/require-permission.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import type { PortalPrincipal } from "@common/portal";
import { CrmAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { PERMISSIONS } from "@modules/portal/crm/access/domain/permissions";

import { FinanceOverviewService } from "../../application/services/finance-overview.service";
import { FinancePeriodsService } from "../../application/services/finance-periods.service";
import { fromCents } from "../../domain/ledger/ledger-money";
import type { DirectionTotals } from "../../domain/ledger/ledger-summary";
import { FinanceOverviewDto } from "../dto/finance-overview.dto";
import { FinancePeriodDto, FinancePeriodParamsDto } from "../dto/finance-period.dto";
import { PeriodRangeDto } from "../dto/ledger-query.dto";

const euros = (totals: DirectionTotals) => ({
    net: fromCents(totals.net),
    tax: fromCents(totals.tax),
    total: fromCents(totals.total),
    withholding: fromCents(totals.withholding),
    payable: fromCents(totals.payable),
    count: totals.count,
});

/** Обзор периода и месяцы учёта: закрыть и открыть месяц — `finance.admin`. */
@ApiTags("CRM Finance")
@Controller("crm/finance")
@CrmAuth({ module: "finance" })
@ApiBearerAuth()
export class CrmFinancePeriodsController {
    constructor(
        private readonly overviews: FinanceOverviewService,
        private readonly periods: FinancePeriodsService
    ) {}

    @Get("overview")
    @RequirePermission(PERMISSIONS.FinanceRead)
    @ApiOperation({ summary: "Доходы, расходы и результат периода, статьи, остатки счетов" })
    @ApiSuccessResponse(FinanceOverviewDto)
    @ApiErrorResponse([400, 401, 403])
    async overview(
        @PortalId() portalId: string,
        @Query() query: PeriodRangeDto
    ): Promise<FinanceOverviewDto> {
        const overview = await this.overviews.overview(portalId, query.from, query.to);
        return {
            from: overview.from,
            to: overview.to,
            income: euros(overview.income),
            expense: euros(overview.expense),
            result: fromCents(overview.result),
            byCategory: overview.byCategory.map((row) => ({
                ...row,
                net: fromCents(row.net),
                total: fromCents(row.total),
            })),
            accounts: overview.accounts.map((row) => ({ ...row, balance: fromCents(row.balance) })),
        };
    }

    @Get("periods")
    @RequirePermission(PERMISSIONS.FinanceRead)
    @ApiOperation({ summary: "Месяцы учёта: с проводками, закрытые и текущий" })
    @ApiSuccessResponse(FinancePeriodDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async list(@PortalId() portalId: string): Promise<FinancePeriodDto[]> {
        return (await this.periods.list(portalId)).map((period) => ({
            ...period,
            closedAt: period.closedAt?.toISOString() ?? null,
        }));
    }

    @Post("periods/:year/:month/close")
    @HttpCode(204)
    @RequirePermission(PERMISSIONS.FinanceAdmin)
    @ApiOperation({
        summary: "Закрыть прошедший месяц: проводки заморожены, исправления — сторно",
        description: "400 period_not_past — текущий месяц; 409 period_already_closed",
    })
    @ApiErrorResponse([400, 401, 403, 409])
    async close(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Param() params: FinancePeriodParamsDto
    ): Promise<void> {
        await this.periods.close(portalId, params, principal.membershipId);
    }

    @Post("periods/:year/:month/reopen")
    @HttpCode(204)
    @RequirePermission(PERMISSIONS.FinanceAdmin)
    @ApiOperation({ summary: "Открыть закрытый месяц снова", description: "409 period_not_closed" })
    @ApiErrorResponse([400, 401, 403, 409])
    async reopen(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Param() params: FinancePeriodParamsDto
    ): Promise<void> {
        await this.periods.reopen(portalId, params, principal.membershipId);
    }
}
