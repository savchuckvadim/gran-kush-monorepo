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

import { RequireMemberJwt } from "@auth/members";
import { CurrentMember } from "@auth/members/api/decorators/current-member.decorator";
import { Member } from "@members/domain/entity/member.entity";
import {
    CancelOrderDto,
    CreateOrderDto,
    OrderDetailDto,
    OrderFilterDto,
    OrderListDto,
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
// LK Orders Controller (Member — Личный кабинет)
// ═══════════════════════════════════════════════════════════════════════════════

@ApiTags("LK Orders (Site)")
@Controller("lk/orders")
@RequireMemberJwt()
@ApiBearerAuth()
export class LkOrdersController {
    constructor(private readonly ordersService: OrdersService) {}

    // ─── Создать заказ ───────────────────────────────────────────────────────

    @Post()
    @ApiOperation({
        summary: "Создать заказ",
        description:
            "Член клуба оформляет заказ. Товары проверяются на наличие, " +
            "рассчитывается стоимость, номер заказа генерируется автоматически.",
    })
    @ApiSuccessResponse(OrderDetailDto, { status: 201 })
    @ApiErrorResponse([400, 401, 403, 404])
    async createOrder(
        @Body() dto: CreateOrderDto,
        @CurrentMember() member: Member
    ): Promise<OrderDetailDto> {
        const order = await this.ordersService.createOrder(member.id, dto);
        return mapOrderToDetailDto(order);
    }

    // ─── Мои заказы ──────────────────────────────────────────────────────────

    @Get()
    @ApiOperation({
        summary: "Мои заказы",
        description: "Список заказов текущего члена клуба с пагинацией и фильтрами.",
    })
    @ApiPaginatedResponse(OrderListDto, {
        description: "Paginated list of member orders",
    })
    @ApiErrorResponse([401, 403])
    async listMyOrders(
        @Query() pagination: PaginationDto,
        @Query() filters: OrderFilterDto,
        @CurrentMember() member: Member
    ): Promise<PaginatedResult<OrderListDto>> {
        const page = pagination.page ?? 1;
        const limit = pagination.limit ?? 10;
        const skip = PaginationUtil.getSkip(page, limit);

        // Принудительно фильтруем по текущему члену
        const memberFilters = { ...filters, memberId: member.id };

        const [orders, total] = await Promise.all([
            this.ordersService.findAll(
                memberFilters,
                limit,
                skip,
                pagination.sortBy,
                pagination.sortOrder
            ),
            this.ordersService.count(memberFilters),
        ]);

        const items = orders.map(mapOrderToListDto);
        return PaginationUtil.createPaginatedResult(items, total, page, limit);
    }

    // ─── Детали моего заказа ─────────────────────────────────────────────────

    @Get(":id")
    @ApiOperation({
        summary: "Детали моего заказа",
        description: "Полная информация о заказе с позициями. Доступен только свой заказ.",
    })
    @ApiSuccessResponse(OrderDetailDto)
    @ApiErrorResponse([401, 403, 404])
    async getMyOrder(
        @Param("id") id: string,
        @CurrentMember() member: Member
    ): Promise<OrderDetailDto> {
        const order = await this.ordersService.findById(id);
        if (!order || order.memberId !== member.id) {
            throw new NotFoundException("Заказ не найден");
        }
        return mapOrderToDetailDto(order);
    }

    // ─── Отменить заказ ──────────────────────────────────────────────────────

    @Patch(":id/cancel")
    @ApiOperation({
        summary: "Отменить заказ",
        description: "Отмена возможна только в статусе 'pending'. Товары возвращаются на склад.",
    })
    @ApiSuccessResponse(OrderDetailDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async cancelMyOrder(
        @Param("id") id: string,
        @Body() dto: CancelOrderDto,
        @CurrentMember() member: Member
    ): Promise<OrderDetailDto> {
        const order = await this.ordersService.cancelOrderByMember(id, member.id, dto.reason);
        return mapOrderToDetailDto(order);
    }
}
