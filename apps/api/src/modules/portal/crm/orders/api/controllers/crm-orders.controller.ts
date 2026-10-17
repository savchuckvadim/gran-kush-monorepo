import {
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    Patch,
    Post,
    Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiPaginatedResponse } from "@common/decorators/response/api-paginated-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { type ContentLocale, RequestLocale } from "@common/i18n";
import { IdempotencyScope, Idempotent } from "@common/idempotency";
import { PaginatedResult } from "@common/paginate/interfaces/paginated-result.interface";
import { PaginationUtil } from "@common/paginate/utils/pagination.util";
import { RequireEmployeeJwt } from "@modules/portal/auth/employees";
import { CurrentEmployee } from "@modules/portal/auth/employees/api/decorators/current-employee.decorator";
import { RequireManager } from "@modules/portal/auth/employees/api/decorators/require-employee-jwt.decorator";
import { Employee } from "@modules/portal/crm/employees/domain/entity/employee.entity";
import {
    CrmCreateOrderDto,
    OrderDetailDto,
    OrderListDto,
    OrderListQueryDto,
    OrderStageSummaryDto,
    OrderStageSummaryQueryDto,
    UpdateOrderStatusDto,
    UpdatePaymentStatusDto,
} from "@modules/portal/crm/orders/api/dto/order.dto";
import { MoveOrderStageDto } from "@modules/portal/crm/orders/api/dto/order-stage.dto";
import { mapOrderToDetailDto, mapOrderToListDto } from "@modules/portal/crm/orders/api/mappers";
import { OrderStagesService } from "@modules/portal/crm/orders/application/services/order-stages.service";
import { OrdersService } from "@modules/portal/crm/orders/application/services/orders.service";
import { PlaceStaffOrderUseCase } from "@modules/portal/crm/orders/application/use-cases/place-staff-order.use-case";

// ═══════════════════════════════════════════════════════════════════════════════
// CRM Orders Controller
// ═══════════════════════════════════════════════════════════════════════════════

@ApiTags("CRM Orders")
@Controller("crm/orders")
@RequireEmployeeJwt()
@ApiBearerAuth()
export class CrmOrdersController {
    constructor(
        private readonly ordersService: OrdersService,
        private readonly stages: OrderStagesService,
        private readonly placeOrder: PlaceStaffOrderUseCase
    ) {}

    // ─── Список заказов ──────────────────────────────────────────────────────

    @Get()
    @ApiOperation({
        summary: "Список заказов (с фильтрами и пагинацией; `stageId` — колонка канбана)",
    })
    @ApiPaginatedResponse(OrderListDto, {
        description: "Paginated list of orders",
    })
    @ApiErrorResponse([401, 403])
    async listOrders(
        @Query() query: OrderListQueryDto,
        @PortalId() portalId: string,
        @RequestLocale() locale: ContentLocale
    ): Promise<PaginatedResult<OrderListDto>> {
        const { page = 1, limit = 10, sortBy, sortOrder, ...filters } = query;
        const skip = PaginationUtil.getSkip(page, limit);

        const scopedFilters = { ...filters, portalId };

        const [orders, total] = await Promise.all([
            this.ordersService.findAll(scopedFilters, limit, skip, sortBy, sortOrder),
            this.ordersService.count(scopedFilters),
        ]);

        const items = orders.map((order) => mapOrderToListDto(order, locale));
        return PaginationUtil.createPaginatedResult(items, total, page, limit);
    }

    // ─── Сводка по стадиям воронки (шапки колонок канбана) ───────────────────

    @Get("stages/summary")
    @ApiOperation({ summary: "Число и сумма заказов в каждой стадии воронки (канбан)" })
    @ApiSuccessResponse(OrderStageSummaryDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async stageSummary(
        @Query() query: OrderStageSummaryQueryDto,
        @PortalId() portalId: string
    ): Promise<OrderStageSummaryDto> {
        const { categoryId, ...filters } = query;
        const stages = await this.stages.summarizeFunnel(portalId, categoryId, filters);
        return { stages };
    }

    // ─── Детали заказа ───────────────────────────────────────────────────────

    @Get(":id")
    @ApiOperation({ summary: "Детали заказа" })
    @ApiSuccessResponse(OrderDetailDto)
    @ApiErrorResponse([401, 403, 404])
    async getOrder(
        @Param("id") id: string,
        @PortalId() portalId: string,
        @RequestLocale() locale: ContentLocale
    ): Promise<OrderDetailDto> {
        const order = await this.ordersService.findByIdForPortal(id, portalId);
        if (!order) {
            throw new NotFoundException("Заказ не найден");
        }
        return mapOrderToDetailDto(order, locale);
    }

    // ─── Создать заказ за участника ──────────────────────────────────────────

    @Post()
    @Idempotent(IdempotencyScope.CRM_ORDER_CREATE)
    @ApiOperation({
        summary:
            "Создать заказ за участника. Любой сотрудник; цена и подарок — по позициям, " +
            "стадию выбирает manager+. 400 — товар недоступен или кончился, стадия отмены",
    })
    @ApiSuccessResponse(OrderDetailDto, { status: 201 })
    @ApiErrorResponse([400, 401, 403, 404])
    async createOrder(
        @Body() dto: CrmCreateOrderDto,
        @CurrentEmployee() employee: Employee,
        @PortalId() portalId: string,
        @RequestLocale() locale: ContentLocale
    ): Promise<OrderDetailDto> {
        const order = await this.placeOrder.execute(dto, employee, portalId);
        return mapOrderToDetailDto(order, locale);
    }

    // ─── Перевести заказ в стадию ────────────────────────────────────────────

    @Patch(":id/stage")
    @RequireManager()
    @ApiOperation({
        summary:
            "Перевести заказ в стадию воронки или переставить карточку в колонке (afterId). Роль: manager+. 400 — чужая стадия или заказ закрыт, 409 — гонка",
    })
    @ApiSuccessResponse(OrderDetailDto)
    @ApiErrorResponse([400, 401, 403, 404, 409])
    async moveToStage(
        @Param("id") id: string,
        @Body() dto: MoveOrderStageDto,
        @CurrentEmployee() employee: Employee,
        @PortalId() portalId: string,
        @RequestLocale() locale: ContentLocale
    ): Promise<OrderDetailDto> {
        const order = await this.stages.moveToStage(
            id,
            dto.stageId,
            employee.id,
            portalId,
            dto.afterId
        );
        return mapOrderToDetailDto(order, locale);
    }

    // ─── Обновить статус заказа (совместимость) ──────────────────────────────

    @Patch(":id/status")
    @RequireManager()
    @ApiOperation({
        summary: "Обновить статус заказа (устарело: используйте PATCH :id/stage). Роль: manager+",
    })
    @ApiSuccessResponse(OrderDetailDto)
    @ApiErrorResponse([400, 401, 403, 404, 409])
    async updateStatus(
        @Param("id") id: string,
        @Body() dto: UpdateOrderStatusDto,
        @CurrentEmployee() employee: Employee,
        @PortalId() portalId: string,
        @RequestLocale() locale: ContentLocale
    ): Promise<OrderDetailDto> {
        const order = await this.stages.updateStatus(
            id,
            dto.status,
            employee.id,
            portalId,
            dto.adminNotes
        );
        return mapOrderToDetailDto(order, locale);
    }

    // ─── Обновить статус оплаты ──────────────────────────────────────────────

    @Patch(":id/payment")
    @RequireManager()
    @ApiOperation({ summary: "Обновить статус оплаты. Роль: manager+" })
    @ApiSuccessResponse(OrderDetailDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async updatePaymentStatus(
        @Param("id") id: string,
        @Body() dto: UpdatePaymentStatusDto,
        @CurrentEmployee() employee: Employee,
        @PortalId() portalId: string,
        @RequestLocale() locale: ContentLocale
    ): Promise<OrderDetailDto> {
        const order = await this.ordersService.updatePaymentStatus(
            id,
            dto.paymentStatus,
            employee.id,
            portalId
        );
        return mapOrderToDetailDto(order, locale);
    }
}
