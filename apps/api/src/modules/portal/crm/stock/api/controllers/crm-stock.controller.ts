import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentPrincipal } from "@common/decorators/auth/current-principal.decorator";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { RequirePermission } from "@common/decorators/auth/require-permission.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiPaginatedResponse } from "@common/decorators/response/api-paginated-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import type { PaginatedResult } from "@common/paginate/interfaces/paginated-result.interface";
import { PaginationUtil } from "@common/paginate/utils/pagination.util";
import type { PortalPrincipal } from "@common/portal";
import { CrmAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { PERMISSIONS } from "@modules/portal/crm/access/domain/permissions";

import { StockService } from "../../application/services/stock.service";
import { StockViewsService } from "../../application/services/stock-views.service";
import { ReceivePurchaseUseCase } from "../../application/use-cases/receive-purchase.use-case";
import {
    ManualStockMoveDto,
    PurchaseDto,
    PurchasesQueryDto,
    ReceivedPurchaseDto,
    ReceivePurchaseDto,
    StockMoveDto,
    StockMovesQueryDto,
    StockStateDto,
} from "../dto/stock.dto";

const DEFAULT_PAGE_SIZE = 25;

/**
 * Склад (TASK-804): поставки и списания — `catalog.manage`; журнал движений и себестоимость —
 * любой сотрудник, кому открыт каталог (остатки он и так видит в товарах).
 */
@ApiTags("CRM Stock")
@Controller("crm/stock")
@CrmAuth()
@ApiBearerAuth()
export class CrmStockController {
    constructor(
        private readonly stock: StockService,
        private readonly views: StockViewsService,
        private readonly receivePurchase: ReceivePurchaseUseCase
    ) {}

    @Get("products/:productId")
    @ApiOperation({ summary: "Остаток и средняя себестоимость товара" })
    @ApiSuccessResponse(StockStateDto)
    @ApiErrorResponse([401, 404])
    async state(
        @PortalId() portalId: string,
        @Param("productId") productId: string
    ): Promise<StockStateDto> {
        return this.views.state(await this.stock.stateOf(portalId, productId));
    }

    @Get("moves")
    @ApiOperation({ summary: "Журнал движений склада: новые сверху" })
    @ApiPaginatedResponse(StockMoveDto)
    @ApiErrorResponse([400, 401])
    async moves(
        @PortalId() portalId: string,
        @Query() query: StockMovesQueryDto
    ): Promise<PaginatedResult<StockMoveDto>> {
        const { page = 1, limit = DEFAULT_PAGE_SIZE, productId } = query;
        const { items, total } = await this.stock.moves(
            portalId,
            { productId },
            { skip: PaginationUtil.getSkip(page, limit), take: limit }
        );
        const views = await this.views.moves(portalId, items);
        return PaginationUtil.createPaginatedResult(views, total, page, limit);
    }

    @Get("purchases")
    @ApiOperation({ summary: "Поставки за период" })
    @ApiPaginatedResponse(PurchaseDto)
    @ApiErrorResponse([400, 401])
    async purchases(
        @PortalId() portalId: string,
        @Query() query: PurchasesQueryDto
    ): Promise<PaginatedResult<PurchaseDto>> {
        const { page = 1, limit = DEFAULT_PAGE_SIZE, ...filter } = query;
        const { items, total } = await this.stock.purchases(portalId, filter, {
            skip: PaginationUtil.getSkip(page, limit),
            take: limit,
        });
        const views = await this.views.purchases(portalId, items);
        return PaginationUtil.createPaginatedResult(views, total, page, limit);
    }

    @Post("purchases")
    @RequirePermission(PERMISSIONS.CatalogManage)
    @ApiOperation({
        summary: "Поставка: приход на склад и расход в учёте одной транзакцией",
        description: "Контрагент не обязателен. 409 period_closed — месяц учёта закрыт",
    })
    @ApiSuccessResponse(ReceivedPurchaseDto, { status: 201 })
    @ApiErrorResponse([400, 401, 403, 404, 409])
    async receive(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Body() dto: ReceivePurchaseDto
    ): Promise<ReceivedPurchaseDto> {
        const result = await this.receivePurchase.execute(portalId, principal.membershipId, {
            productId: dto.productId,
            quantity: dto.quantity,
            unitCost: dto.unitCost,
            counterpartyId: dto.counterpartyId ?? null,
            receivedOn: dto.receivedOn,
        });
        const [move] = await this.views.moves(portalId, [result.move]);
        return {
            purchaseId: result.purchaseId,
            move,
            ledgerEntryId: result.ledgerEntryId,
            stock: this.views.state(await this.stock.stateOf(portalId, dto.productId)),
        };
    }

    @Post("moves")
    @RequirePermission(PERMISSIONS.CatalogManage)
    @ApiOperation({ summary: "Списание, подарок или пересчёт — с причиной" })
    @ApiSuccessResponse(StockMoveDto, { status: 201 })
    @ApiErrorResponse([400, 401, 403, 404])
    async move(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Body() dto: ManualStockMoveDto
    ): Promise<StockMoveDto> {
        const move = await this.stock.moveManually(portalId, principal.membershipId, dto);
        const [view] = await this.views.moves(portalId, [move]);
        return view;
    }
}
