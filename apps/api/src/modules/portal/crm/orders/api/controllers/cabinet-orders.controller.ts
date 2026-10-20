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

import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiPaginatedResponse } from "@common/decorators/response/api-paginated-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { type ContentLocale, RequestLocale } from "@common/i18n";
import { IdempotencyScope, Idempotent } from "@common/idempotency";
import { PaginationDto } from "@common/paginate/dto/pagination.dto";
import { PaginatedResult } from "@common/paginate/interfaces/paginated-result.interface";
import { PaginationUtil } from "@common/paginate/utils/pagination.util";
import { CurrentMember } from "@modules/portal/auth/members/api/decorators/current-member.decorator";
import { CabinetAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { RequireShopAccess } from "@modules/portal/crm/club-policy/api/guards/shop-access.guard";
import { Member } from "@modules/portal/crm/members/domain/entity/member.entity";
import {
    CabinetOrderDetailDto,
    CabinetOrderListDto,
} from "@modules/portal/crm/orders/api/dto/cabinet-order.dto";
import { CancelOrderDto, CreateOrderDto } from "@modules/portal/crm/orders/api/dto/order-input.dto";
import {
    mapOrderToCabinetDetailDto,
    mapOrderToCabinetListDto,
} from "@modules/portal/crm/orders/api/mappers";
import { OrderStagesService } from "@modules/portal/crm/orders/application/services/order-stages.service";
import { OrdersService } from "@modules/portal/crm/orders/application/services/orders.service";
import { PlaceCabinetOrderUseCase } from "@modules/portal/crm/orders/application/use-cases/place-cabinet-order.use-case";

/**
 * Заказы участника в клубе: оформление, свои заказы, отмена. Ответы — в форме кабинета
 * (`CabinetOrder*Dto`), без внутренних данных клуба.
 */
@ApiTags("Cabinet Orders")
@Controller("cabinet/orders")
@CabinetAuth()
@ApiBearerAuth()
export class CabinetOrdersController {
    constructor(
        private readonly ordersService: OrdersService,
        private readonly stages: OrderStagesService,
        private readonly placeOrder: PlaceCabinetOrderUseCase
    ) {}

    @Post()
    @RequireShopAccess("order")
    @Idempotent(IdempotencyScope.LK_ORDER_CREATE)
    @ApiOperation({
        summary: "Оформить заказ",
        description:
            "Товары проверяются на наличие и видимость участнику (аудитории), стоимость " +
            "считается на сервере. Отказы: 404 `product_unavailable`, 400 `insufficient_stock`.",
    })
    @ApiSuccessResponse(CabinetOrderDetailDto, { status: 201 })
    @ApiErrorResponse([400, 401, 403, 404])
    async createOrder(
        @Body() dto: CreateOrderDto,
        @CurrentMember() member: Member,
        @RequestLocale() locale: ContentLocale
    ): Promise<CabinetOrderDetailDto> {
        const order = await this.placeOrder.execute(member.id, member.portalId, dto);
        return mapOrderToCabinetDetailDto(
            order,
            locale,
            await this.stages.funnelOf(order, member.portalId)
        );
    }

    @Get()
    @ApiOperation({ summary: "Мои заказы", description: "Сначала новые." })
    @ApiPaginatedResponse(CabinetOrderListDto, { description: "Заказы участника в клубе" })
    @ApiErrorResponse([401, 403])
    async listMyOrders(
        @Query() query: PaginationDto,
        @CurrentMember() member: Member,
        @RequestLocale() locale: ContentLocale
    ): Promise<PaginatedResult<CabinetOrderListDto>> {
        const { page = 1, limit = 10, sortBy, sortOrder } = query;
        const skip = PaginationUtil.getSkip(page, limit);
        const filters = { portalId: member.portalId, memberId: member.id };

        const [orders, total] = await Promise.all([
            this.ordersService.findAll(filters, limit, skip, sortBy, sortOrder),
            this.ordersService.count(filters),
        ]);

        const items = orders.map((order) => mapOrderToCabinetListDto(order, locale));
        return PaginationUtil.createPaginatedResult(items, total, page, limit);
    }

    @Get(":id")
    @ApiOperation({ summary: "Мой заказ", description: "Только свой заказ в этом клубе." })
    @ApiSuccessResponse(CabinetOrderDetailDto)
    @ApiErrorResponse([401, 403, 404])
    async getMyOrder(
        @Param("id") id: string,
        @CurrentMember() member: Member,
        @RequestLocale() locale: ContentLocale
    ): Promise<CabinetOrderDetailDto> {
        const order = await this.ordersService.findByIdForPortal(id, member.portalId);
        if (!order || order.memberId !== member.id) {
            throw new NotFoundException("Заказ не найден");
        }
        return mapOrderToCabinetDetailDto(
            order,
            locale,
            await this.stages.funnelOf(order, member.portalId)
        );
    }

    @Patch(":id/cancel")
    @ApiOperation({
        summary: "Отменить заказ",
        description:
            "Пока клуб не взял заказ в работу (стадия «новый»). Товары возвращаются на склад.",
    })
    @ApiSuccessResponse(CabinetOrderDetailDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async cancelMyOrder(
        @Param("id") id: string,
        @Body() dto: CancelOrderDto,
        @CurrentMember() member: Member,
        @RequestLocale() locale: ContentLocale
    ): Promise<CabinetOrderDetailDto> {
        const order = await this.stages.cancelOrderByMember(
            id,
            member.id,
            member.portalId,
            dto.reason
        );
        return mapOrderToCabinetDetailDto(
            order,
            locale,
            await this.stages.funnelOf(order, member.portalId)
        );
    }
}
