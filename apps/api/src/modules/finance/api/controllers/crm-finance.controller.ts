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

import { CurrentEmployee } from "@auth/employees/api/decorators/current-employee.decorator";
import { AdminGuard } from "@auth/employees/infrastructure/guards/admin.guard";
import { EmployeeJwtAuthGuard } from "@auth/employees/infrastructure/guards/employee-jwt-auth.guard";
import { Employee } from "@employees/domain/entity/employee.entity";
import {
    CreateFinancialTransactionDto,
    FinancialTransactionDetailDto,
    FinancialTransactionListDto,
    ReportPeriodDto,
    TransactionFilterDto,
    TransactionGroupedByDateDto,
    TransactionGroupedByTypeDto,
    TransactionSummaryDto,
} from "@finance/api/dto/financial-transaction.dto";
import { mapTransactionToDetailDto, mapTransactionToListDto } from "@finance/api/mappers";
import { FinanceService } from "@finance/application/services/finance.service";

import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiPaginatedResponse } from "@common/decorators/response/api-paginated-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { PaginationDto } from "@common/paginate/dto/pagination.dto";
import { PaginatedResult } from "@common/paginate/interfaces/paginated-result.interface";
import { PaginationUtil } from "@common/paginate/utils/pagination.util";

// ═══════════════════════════════════════════════════════════════════════════════
// CRM Finance Controller
// ═══════════════════════════════════════════════════════════════════════════════

@ApiTags("CRM Finance")
@Controller("crm/finance")
@UseGuards(EmployeeJwtAuthGuard)
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
        @Query() pagination: PaginationDto,
        @Query() filters: TransactionFilterDto
    ): Promise<PaginatedResult<FinancialTransactionListDto>> {
        const page = pagination.page ?? 1;
        const limit = pagination.limit ?? 10;
        const skip = PaginationUtil.getSkip(page, limit);

        const [txns, total] = await Promise.all([
            this.financeService.findAll(
                filters,
                limit,
                skip,
                pagination.sortBy,
                pagination.sortOrder
            ),
            this.financeService.count(filters),
        ]);

        const items = txns.map(mapTransactionToListDto);
        return PaginationUtil.createPaginatedResult(items, total, page, limit);
    }

    @Get("transactions/:id")
    @ApiOperation({ summary: "Детали транзакции" })
    @ApiSuccessResponse(FinancialTransactionDetailDto)
    @ApiErrorResponse([401, 403, 404])
    async getTransaction(@Param("id") id: string): Promise<FinancialTransactionDetailDto> {
        const txn = await this.financeService.findById(id);
        if (!txn) {
            throw new NotFoundException("Транзакция не найдена");
        }
        return mapTransactionToDetailDto(txn);
    }

    @Post("transactions")
    @UseGuards(AdminGuard)
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
        @CurrentEmployee() employee: Employee
    ): Promise<FinancialTransactionDetailDto> {
        const txn = await this.financeService.createManualTransaction(dto, employee.id);
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
    async getSummary(@Query() period: ReportPeriodDto): Promise<TransactionSummaryDto> {
        const startDate = new Date(period.startDate);
        const endDate = new Date(period.endDate);
        endDate.setHours(23, 59, 59, 999); // До конца дня

        return this.financeService.getSummary(startDate, endDate);
    }

    @Get("reports/by-type")
    @ApiOperation({
        summary: "Статистика по типам транзакций",
        description: "Группировка по типу и направлению транзакции за период.",
    })
    @ApiSuccessResponse(TransactionGroupedByTypeDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async getByType(@Query() period: ReportPeriodDto): Promise<TransactionGroupedByTypeDto[]> {
        const startDate = new Date(period.startDate);
        const endDate = new Date(period.endDate);
        endDate.setHours(23, 59, 59, 999);

        return this.financeService.getGroupedByType(startDate, endDate);
    }

    @Get("reports/by-date")
    @ApiOperation({
        summary: "Статистика по датам (для графиков)",
        description:
            "Доходы и расходы по дням за указанный период. " + "Подходит для построения графиков.",
    })
    @ApiSuccessResponse(TransactionGroupedByDateDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async getByDate(@Query() period: ReportPeriodDto): Promise<TransactionGroupedByDateDto[]> {
        const startDate = new Date(period.startDate);
        const endDate = new Date(period.endDate);
        endDate.setHours(23, 59, 59, 999);

        return this.financeService.getGroupedByDate(startDate, endDate);
    }
}
