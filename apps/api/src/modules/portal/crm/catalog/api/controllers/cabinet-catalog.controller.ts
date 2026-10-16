import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { RequireMemberJwt } from "@modules/portal/auth/members";
import {
    CabinetProductCategoryDto,
    CabinetProductDto,
} from "@modules/portal/crm/catalog/api/dto/cabinet-product.dto";
import {
    mapCategoryToCabinetDto,
    mapProductToCabinetDto,
} from "@modules/portal/crm/catalog/api/mappers";
import { ProductCategoriesService } from "@modules/portal/crm/catalog/application/services/product-categories.service";
import { ProductsService } from "@modules/portal/crm/catalog/application/services/products.service";
import { RequireShopAccess } from "@modules/portal/crm/club-policy/api/guards/shop-access.guard";

/**
 * Витрина клуба для его участников: открыта по правилам клуба (`RequireShopAccess`). Отдаёт
 * только активные и доступные товары и без складских данных клуба.
 */
@ApiTags("Cabinet Catalog")
@Controller("cabinet/catalog")
@RequireMemberJwt()
@ApiBearerAuth()
export class CabinetCatalogController {
    constructor(
        private readonly productsService: ProductsService,
        private readonly categoriesService: ProductCategoriesService
    ) {}

    @Get("products")
    @RequireShopAccess("browse")
    @ApiOperation({ summary: "Витрина: активные и доступные товары" })
    @ApiSuccessResponse(CabinetProductDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async getProducts(@PortalId() portalId: string): Promise<CabinetProductDto[]> {
        const products = await this.productsService.findActive(portalId);
        return products.map(mapProductToCabinetDto);
    }

    @Get("products/:id")
    @RequireShopAccess("browse")
    @ApiOperation({ summary: "Товар витрины" })
    @ApiSuccessResponse(CabinetProductDto)
    @ApiErrorResponse([401, 403, 404])
    async getProduct(
        @Param("id") id: string,
        @PortalId() portalId: string
    ): Promise<CabinetProductDto> {
        const product = await this.productsService.findById(id, portalId);
        if (!product || !product.isActive || !product.isAvailable) {
            throw new NotFoundException("Product not found or not available");
        }
        return mapProductToCabinetDto(product);
    }

    @Get("categories")
    @RequireShopAccess("browse")
    @ApiOperation({ summary: "Категории витрины" })
    @ApiSuccessResponse(CabinetProductCategoryDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async getCategories(@PortalId() portalId: string): Promise<CabinetProductCategoryDto[]> {
        const categories = await this.categoriesService.findAll(portalId, true);
        return categories.map(mapCategoryToCabinetDto);
    }
}
