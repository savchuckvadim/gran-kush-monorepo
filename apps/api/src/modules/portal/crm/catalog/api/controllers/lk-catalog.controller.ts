import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { RequireMemberJwt } from "@modules/portal/auth/members";
import { ProductDetailDto, ProductListDto } from "@modules/portal/crm/catalog/api/dto/product.dto";
import { ProductCategoryDto } from "@modules/portal/crm/catalog/api/dto/product-category.dto";
import {
    mapCategoryToDto,
    mapProductToDetailDto,
    mapProductToListDto,
} from "@modules/portal/crm/catalog/api/mappers";
import { ProductCategoriesService } from "@modules/portal/crm/catalog/application/services/product-categories.service";
import { ProductsService } from "@modules/portal/crm/catalog/application/services/products.service";

// ═══════════════════════════════════════════════════════════════════════════════
// LK Catalog Controller (для членов клуба)
// ═══════════════════════════════════════════════════════════════════════════════

@ApiTags("Member Catalog (Site - LK)")
@Controller("lk/catalog")
@RequireMemberJwt()
@ApiBearerAuth()
export class LkCatalogController {
    constructor(
        private readonly productsService: ProductsService,
        private readonly categoriesService: ProductCategoriesService
    ) {}

    @Get("products")
    @ApiOperation({ summary: "Каталог товаров (только активные и доступные)" })
    @ApiSuccessResponse(ProductListDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async getProducts(@PortalId() portalId: string): Promise<ProductListDto[]> {
        const products = await this.productsService.findActive(portalId);
        return products.map(mapProductToListDto);
    }

    @Get("products/:id")
    @ApiOperation({ summary: "Детали товара" })
    @ApiSuccessResponse(ProductDetailDto)
    @ApiErrorResponse([401, 403, 404])
    async getProduct(
        @Param("id") id: string,
        @PortalId() portalId: string
    ): Promise<ProductDetailDto> {
        const product = await this.productsService.findById(id, portalId);
        if (!product || !product.isActive || !product.isAvailable) {
            throw new NotFoundException("Product not found or not available");
        }
        return mapProductToDetailDto(product);
    }

    @Get("categories")
    @ApiOperation({ summary: "Список категорий" })
    @ApiSuccessResponse(ProductCategoryDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async getCategories(@PortalId() portalId: string): Promise<ProductCategoryDto[]> {
        const cats = await this.categoriesService.findAll(portalId, true);
        return cats.map(mapCategoryToDto);
    }
}
