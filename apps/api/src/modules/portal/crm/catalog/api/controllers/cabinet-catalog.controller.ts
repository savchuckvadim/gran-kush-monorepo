import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import type { Member } from "@prisma/client";

import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { CurrentMember, RequireMemberJwt } from "@modules/portal/auth/members";
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
import { MemberAccessService } from "@modules/portal/crm/club-policy/application/services/member-access.service";

/**
 * Витрина клуба для его участников: открыта по правилам клуба (`RequireShopAccess`). Отдаёт
 * только активные и доступные товары, видимые аудиториям участника, и без складских данных клуба.
 */
@ApiTags("Cabinet Catalog")
@Controller("cabinet/catalog")
@RequireMemberJwt()
@ApiBearerAuth()
export class CabinetCatalogController {
    constructor(
        private readonly productsService: ProductsService,
        private readonly categoriesService: ProductCategoriesService,
        private readonly access: MemberAccessService
    ) {}

    @Get("products")
    @RequireShopAccess("browse")
    @ApiOperation({ summary: "Витрина: активные и доступные товары" })
    @ApiSuccessResponse(CabinetProductDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async getProducts(@CurrentMember() member: Member): Promise<CabinetProductDto[]> {
        const audiences = await this.access.audiencesOf(member.id, member.portalId);
        const products = await this.productsService.findActive(member.portalId, audiences);
        return products.map(mapProductToCabinetDto);
    }

    @Get("products/:id")
    @RequireShopAccess("browse")
    @ApiOperation({ summary: "Товар витрины" })
    @ApiSuccessResponse(CabinetProductDto)
    @ApiErrorResponse([401, 403, 404])
    async getProduct(
        @Param("id") id: string,
        @CurrentMember() member: Member
    ): Promise<CabinetProductDto> {
        const audiences = await this.access.audiencesOf(member.id, member.portalId);
        const product = await this.productsService.findForShop(id, member.portalId, audiences);
        if (!product) {
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
