import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { RequireEmployeeJwt } from "@modules/portal/auth/employees";
import { CrmSearchService } from "@modules/portal/crm/search/application/services/crm-search.service";

import { CrmSearchQueryDto, CrmSearchResponseDto } from "../dto/crm-search.dto";

@ApiTags("CRM Search")
@Controller("crm/search")
@RequireEmployeeJwt()
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
        @Query() query: CrmSearchQueryDto
    ): Promise<CrmSearchResponseDto> {
        const result = await this.crmSearch.searchAll(portalId, query.q, query.limit);
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
