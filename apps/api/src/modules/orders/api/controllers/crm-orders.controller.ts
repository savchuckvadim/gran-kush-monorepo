import {
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    Patch,
    Query,
    UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentEmployee } from "@auth/employees/api/decorators/current-employee.decorator";
import { AdminGuard } from "@auth/employees/infrastructure/guards/admin.guard";
import { EmployeeJwtAuthGuard } from "@auth/employees/infrastructure/guards/employee-jwt-auth.guard";
import { Employee } from "@employees/domain/entity/employee.entity";
import {
    OrderDetailDto,
    OrderFilterDto,
    OrderListDto,
    UpdateOrderStatusDto,
    UpdatePaymentStatusDto,
} from "@orders/api/dto/order.dto";
import { mapOrderToDetailDto, mapOrderToListDto } from "@orders/api/mappers";
import { OrdersService } from "@orders/application/services/orders.service";

import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiPaginatedResponse } from "@common/decorators/response/api-paginated-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { PaginationDto } from "@common/paginate/dto/pagination.dto";
import { PaginatedResult } from "@common/paginate/interfaces/paginated-result.interface";
import { PaginationUtil } from "@common/paginate/utils/pagination.util";

// ═══════════════════════════════════════════════════════════════════════════════
// CRM Orders Controller
// ═══════════════════════════════════════════════════════════════════════════════

@ApiTags("CRM Orders")
@Controller("crm/orders")
@UseGuards(EmployeeJwtAuthGuard)
@ApiBearerAuth()
export class CrmOrdersController {
    constructor(private readonly ordersService: OrdersService) {}

    // ─── Список заказов ──────────────────────────────────────────────────────

    @Get()
    @ApiOperation({ summary: "Список заказов (с фильтрами и пагинацией)" })
    @ApiPaginatedResponse(OrderListDto, {
        description: "Paginated list of orders",
    })
    @ApiErrorResponse([401, 403])
    async listOrders(
        @Query() pagination: PaginationDto,
        @Query() filters: OrderFilterDto
    ): Promise<PaginatedResult<OrderListDto>> {
        const page = pagination.page ?? 1;
        const limit = pagination.limit ?? 10;
        const skip = PaginationUtil.getSkip(page, limit);

        const [orders, total] = await Promise.all([
            this.ordersService.findAll(
                filters,
                limit,
                skip,
                pagination.sortBy,
                pagination.sortOrder
            ),
            this.ordersService.count(filters),
        ]);

        const items = orders.map(mapOrderToListDto);
        return PaginationUtil.createPaginatedResult(items, total, page, limit);
    }

    // ─── Детали заказа ───────────────────────────────────────────────────────

    @Get(":id")
    @ApiOperation({ summary: "Детали заказа" })
    @ApiSuccessResponse(OrderDetailDto)
    @ApiErrorResponse([401, 403, 404])
    async getOrder(@Param("id") id: string): Promise<OrderDetailDto> {
        const order = await this.ordersService.findById(id);
        if (!order) {
            throw new NotFoundException("Заказ не найден");
        }
        return mapOrderToDetailDto(order);
    }

    // ─── Обновить статус заказа ──────────────────────────────────────────────

    @Patch(":id/status")
    @ApiOperation({ summary: "Обновить статус заказа" })
    @ApiSuccessResponse(OrderDetailDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async updateStatus(
        @Param("id") id: string,
        @Body() dto: UpdateOrderStatusDto,
        @CurrentEmployee() employee: Employee
    ): Promise<OrderDetailDto> {
        const order = await this.ordersService.updateStatus(
            id,
            dto.status,
            employee.id,
            dto.adminNotes
        );
        return mapOrderToDetailDto(order);
    }

    // ─── Обновить статус оплаты ──────────────────────────────────────────────

    @Patch(":id/payment")
    @ApiOperation({ summary: "Обновить статус оплаты" })
    @ApiSuccessResponse(OrderDetailDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async updatePaymentStatus(
        @Param("id") id: string,
        @Body() dto: UpdatePaymentStatusDto,
        @CurrentEmployee() employee: Employee
    ): Promise<OrderDetailDto> {
        const order = await this.ordersService.updatePaymentStatus(
            id,
            dto.paymentStatus,
            employee.id
        );
        return mapOrderToDetailDto(order);
    }
}
