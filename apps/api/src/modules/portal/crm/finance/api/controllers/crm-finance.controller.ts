import {
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    Post,
    Query,
    UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiPaginatedResponse } from "@common/decorators/response/api-paginated-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { IdempotencyScope, Idempotent } from "@common/idempotency";
import { PaginatedResult } from "@common/paginate/interfaces/paginated-result.interface";
import { PaginationUtil } from "@common/paginate/utils/pagination.util";
import { RequireEmployeeJwt } from "@modules/portal/auth/employees";
import { CurrentEmployee } from "@modules/portal/auth/employees/api/decorators/current-employee.decorator";
import { RequireAdmin } from "@modules/portal/auth/employees/api/decorators/require-employee-jwt.decorator";
import { Employee } from "@modules/portal/crm/employees/domain/entity/employee.entity";
import {
    CreateFinancialTransactionDto,
    FinancialTransactionDetailDto,
    FinancialTransactionListDto,
    ReportPeriodDto,
    TransactionGroupedByDateDto,
    TransactionGroupedByTypeDto,
    TransactionListQueryDto,
    TransactionSummaryDto,
} from "@modules/portal/crm/finance/api/dto/financial-transaction.dto";
import {
    mapTransactionToDetailDto,
    mapTransactionToListDto,
} from "@modules/portal/crm/finance/api/mappers";
import { FinanceService } from "@modules/portal/crm/finance/application/services/finance.service";

// ═══════════════════════════════════════════════════════════════════════════════
// CRM Finance Controller
// ═══════════════════════════════════════════════════════════════════════════════

@ApiTags("CRM Finance")
@Controller("crm/finance")
@RequireEmployeeJwt()
@ApiBearerAuth()
export class CrmFinanceController {
    constructor(private readonly financeService: FinanceService) {}

    // ─── Транзакции ──────────────────────────────────────────────────────────

    @Get("transactions")
    @ApiOperation({ summary: "Список транзакций (с фильтрами и пагинацией)" })
    @ApiPaginatedResponse(FinancialTransactionListDto, {
        description: "Paginated list of transactions",
    })
    @ApiErrorResponse([401, 403])
    async listTransactions(
        @Query() query: TransactionListQueryDto,
        @PortalId() portalId: string
    ): Promise<PaginatedResult<FinancialTransactionListDto>> {
        const { page = 1, limit = 10, sortBy, sortOrder, ...filters } = query;
        const skip = PaginationUtil.getSkip(page, limit);

        const [txns, total] = await Promise.all([
            this.financeService.findAll(portalId, filters, limit, skip, sortBy, sortOrder),
            this.financeService.count(portalId, filters),
        ]);

        const items = txns.map(mapTransactionToListDto);
        return PaginationUtil.createPaginatedResult(items, total, page, limit);
    }

    @Get("transactions/:id")
    @ApiOperation({ summary: "Детали транзакции" })
    @ApiSuccessResponse(FinancialTransactionDetailDto)
    @ApiErrorResponse([401, 403, 404])
    async getTransaction(
        @Param("id") id: string,
        @PortalId() portalId: string
    ): Promise<FinancialTransactionDetailDto> {
        const txn = await this.financeService.findById(id, portalId);
        if (!txn) {
            throw new NotFoundException("Транзакция не найдена");
        }
        return mapTransactionToDetailDto(txn);
    }

    @Post("transactions")
    @RequireAdmin()
    @Idempotent(IdempotencyScope.CRM_FINANCE_TRANSACTION_CREATE)
    @ApiOperation({
        summary: "Создать ручную транзакцию (Admin)",
        description:
            "Ручное создание финансовой транзакции. " +
            "Автоматические транзакции создаются при оплате/возврате заказов.",
    })
    @ApiSuccessResponse(FinancialTransactionDetailDto, { status: 201 })
    @ApiErrorResponse([400, 401, 403])
    async createTransaction(
        @Body() dto: CreateFinancialTransactionDto,
        @CurrentEmployee() employee: Employee,
        @PortalId() portalId: string
    ): Promise<FinancialTransactionDetailDto> {
        const txn = await this.financeService.createManualTransaction(dto, employee.id, portalId);
        return mapTransactionToDetailDto(txn);
    }

    // ─── Отчёты ──────────────────────────────────────────────────────────────

    @Get("reports/summary")
    @ApiOperation({
        summary: "Суммарная финансовая статистика",
        description:
            "Общий доход, расход и чистый итог за период. " +
            "Если период не указан — за всё время.",
    })
    @ApiSuccessResponse(TransactionSummaryDto)
    @ApiErrorResponse([401, 403])
    async getSummary(
        @Query() period: ReportPeriodDto,
        @PortalId() portalId: string
    ): Promise<TransactionSummaryDto> {
        const startDate = new Date(period.startDate);
        const endDate = new Date(period.endDate);
        endDate.setHours(23, 59, 59, 999); // До конца дня

        return this.financeService.getSummary(portalId, startDate, endDate);
    }

    @Get("reports/by-type")
    @ApiOperation({
        summary: "Статистика по типам транзакций",
        description: "Группировка по типу и направлению транзакции за период.",
    })
    @ApiSuccessResponse(TransactionGroupedByTypeDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async getByType(
        @Query() period: ReportPeriodDto,
        @PortalId() portalId: string
    ): Promise<TransactionGroupedByTypeDto[]> {
        const startDate = new Date(period.startDate);
        const endDate = new Date(period.endDate);
        endDate.setHours(23, 59, 59, 999);

        return this.financeService.getGroupedByType(portalId, startDate, endDate);
    }

    @Get("reports/by-date")
    @ApiOperation({
        summary: "Статистика по датам (для графиков)",
        description:
            "Доходы и расходы по дням за указанный период. " + "Подходит для построения графиков.",
    })
    @ApiSuccessResponse(TransactionGroupedByDateDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async getByDate(
        @Query() period: ReportPeriodDto,
        @PortalId() portalId: string
    ): Promise<TransactionGroupedByDateDto[]> {
        const startDate = new Date(period.startDate);
        const endDate = new Date(period.endDate);
        endDate.setHours(23, 59, 59, 999);

        return this.financeService.getGroupedByDate(portalId, startDate, endDate);
    }
}
