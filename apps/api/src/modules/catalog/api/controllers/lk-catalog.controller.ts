import { Controller, Get, NotFoundException, Param, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { MemberJwtAuthGuard } from "@auth/members/infrastructure/guards/member-jwt-auth.guard";
import { ProductDetailDto, ProductListDto } from "@catalog/api/dto/product.dto";
import { ProductCategoryDto } from "@catalog/api/dto/product-category.dto";
import { mapCategoryToDto, mapProductToDetailDto, mapProductToListDto } from "@catalog/api/mappers";
import { ProductCategoriesService } from "@catalog/application/services/product-categories.service";
import { ProductsService } from "@catalog/application/services/products.service";

import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";

// ═══════════════════════════════════════════════════════════════════════════════
// LK Catalog Controller (для членов клуба)
// Каталог доступен всем авторизованным членам.
// Проверка присутствия в клубе будет добавлена в PresenceModule (Guard).
// ═══════════════════════════════════════════════════════════════════════════════

@ApiTags("Member Catalog (Site - LK)")
@Controller("lk/catalog")
@UseGuards(MemberJwtAuthGuard)
@ApiBearerAuth()
export class LkCatalogController {
    constructor(
        private readonly productsService: ProductsService,
        private readonly categoriesService: ProductCategoriesService
    ) {}

    @Get("products")
    @ApiOperation({
        summary: "Каталог товаров (только активные и доступные)",
        description:
            "Возвращает только активные и доступные товары. " +
            "В будущем добавится проверка присутствия в клубе.",
    })
    @ApiSuccessResponse(ProductListDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async getProducts(): Promise<ProductListDto[]> {
        // TODO: Проверка присутствия через PresenceService после реализации модуля
        const products = await this.productsService.findActive();
        return products.map(mapProductToListDto);
    }

    @Get("products/:id")
    @ApiOperation({ summary: "Детали товара" })
    @ApiSuccessResponse(ProductDetailDto)
    @ApiErrorResponse([401, 403, 404])
    async getProduct(@Param("id") id: string): Promise<ProductDetailDto> {
        const product = await this.productsService.findById(id);
        if (!product || !product.isActive || !product.isAvailable) {
            throw new NotFoundException("Product not found or not available");
        }
        return mapProductToDetailDto(product);
    }

    @Get("categories")
    @ApiOperation({ summary: "Список категорий" })
    @ApiSuccessResponse(ProductCategoryDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async getCategories(): Promise<ProductCategoryDto[]> {
        const cats = await this.categoriesService.findAll(true); // Только активные
        return cats.map(mapCategoryToDto);
    }
}
