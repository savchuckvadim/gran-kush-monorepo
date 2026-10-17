import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentPrincipal } from "@common/decorators/auth/current-principal.decorator";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { type PortalPrincipal, principalCan } from "@common/portal";
import { CrmAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { PERMISSIONS } from "@modules/portal/crm/access/domain/permissions";
import { CrmSearchService } from "@modules/portal/crm/search/application/services/crm-search.service";

import { CrmSearchQueryDto, CrmSearchResponseDto } from "../dto/crm-search.dto";

@ApiTags("CRM Search")
@Controller("crm/search")
@CrmAuth()
@ApiBearerAuth()
export class CrmSearchController {
    constructor(private readonly crmSearch: CrmSearchService) {}

    @Get()
    @ApiOperation({
        summary: "Быстрый поиск по клубу (Ctrl K)",
        description:
            "Участники по имени, телефону, номеру и email; товары по названию и SKU; заказы по номеру.",
    })
    @ApiSuccessResponse(CrmSearchResponseDto)
    @ApiErrorResponse([400, 401, 402, 403])
    async search(
        @PortalId() portalId: string,
        @Query() query: CrmSearchQueryDto,
        @CurrentPrincipal() principal: PortalPrincipal
    ): Promise<CrmSearchResponseDto> {
        const scope = {
            members: principalCan(principal, PERMISSIONS.MembersRead),
            orders: principalCan(principal, PERMISSIONS.OrdersRead),
        };
        const result = await this.crmSearch.searchAll(portalId, query.q, scope, query.limit);
        return {
            members: result.members,
            products: result.products,
            orders: result.orders.map((order) => ({
                ...order,
                orderedAt: order.orderedAt.toISOString(),
            })),
        };
    }
}
