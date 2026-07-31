import {
    Body,
    Controller,
    Delete,
    Get,
    NotFoundException,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiPaginatedResponse } from "@common/decorators/response/api-paginated-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { PaginationDto } from "@common/paginate/dto/pagination.dto";
import { PaginatedResult } from "@common/paginate/interfaces/paginated-result.interface";
import { PaginationUtil } from "@common/paginate/utils/pagination.util";
import { RequireEmployeeJwt } from "@modules/portal/auth/employees";
import { CurrentEmployee } from "@modules/portal/auth/employees/api/decorators/current-employee.decorator";
import { RequireAdmin } from "@modules/portal/auth/employees/api/decorators/require-employee-jwt.decorator";
import {
    CreateMeasurementUnitDto,
    MeasurementUnitDto,
    UpdateMeasurementUnitDto,
} from "@modules/portal/crm/catalog/api/dto/measurement-unit.dto";
import {
    CreateProductDto,
    ProductDetailDto,
    ProductFilterDto,
    ProductListDto,
    UpdateProductDto,
} from "@modules/portal/crm/catalog/api/dto/product.dto";
import {
    CreateProductCategoryDto,
    ProductCategoryDto,
    ProductCategoryTreeDto,
    UpdateProductCategoryDto,
} from "@modules/portal/crm/catalog/api/dto/product-category.dto";
import {
    mapCategoryToDto,
    mapCategoryToTreeDto,
    mapMeasurementUnitToDto,
    mapProductToDetailDto,
    mapProductToListDto,
} from "@modules/portal/crm/catalog/api/mappers";
import { MeasurementUnitsService } from "@modules/portal/crm/catalog/application/services/measurement-units.service";
import { ProductCategoriesService } from "@modules/portal/crm/catalog/application/services/product-categories.service";
import { ProductsService } from "@modules/portal/crm/catalog/application/services/products.service";
import { Employee } from "@modules/portal/crm/employees/domain/entity/employee.entity";

// ═══════════════════════════════════════════════════════════════════════════════
// CRM Catalog Controller
// ═══════════════════════════════════════════════════════════════════════════════

@ApiTags("CRM Catalog")
@Controller("crm/catalog")
@RequireEmployeeJwt()
@ApiBearerAuth()
export class CrmCatalogController {
    constructor(
        private readonly productsService: ProductsService,
        private readonly categoriesService: ProductCategoriesService,
        private readonly unitsService: MeasurementUnitsService
    ) {}

    // ─── Products ────────────────────────────────────────────────────────────

    @Get("products")
    @ApiOperation({ summary: "Список товаров (с фильтрами и пагинацией)" })
    @ApiPaginatedResponse(ProductListDto, { description: "Paginated list of products" })
    @ApiErrorResponse([401, 403])
    async listProducts(
        @PortalId() portalId: string,
        @Query() pagination: PaginationDto,
        @Query() filters: ProductFilterDto
    ): Promise<PaginatedResult<ProductListDto>> {
        const page = pagination.page ?? 1;
        const limit = pagination.limit ?? 10;
        const skip = PaginationUtil.getSkip(page, limit);

        const [products, total] = await Promise.all([
            this.productsService.findAll(
                portalId,
                filters,
                limit,
                skip,
                pagination.sortBy,
                pagination.sortOrder
            ),
            this.productsService.count(portalId, filters),
        ]);

        const items = products.map(mapProductToListDto);
        return PaginationUtil.createPaginatedResult(items, total, page, limit);
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
        if (!product) {
            throw new NotFoundException("Product not found");
        }
        return mapProductToDetailDto(product);
    }

    @Post("products")
    @RequireAdmin()
    @ApiOperation({ summary: "Создать товар (Admin)" })
    @ApiSuccessResponse(ProductDetailDto, { status: 201 })
    @ApiErrorResponse([400, 401, 403, 404, 409])
    async createProduct(
        @Body() dto: CreateProductDto,
        @PortalId() portalId: string,
        @CurrentEmployee() employee: Employee
    ): Promise<ProductDetailDto> {
        const product = await this.productsService.create(dto, portalId, employee.id);
        return mapProductToDetailDto(product);
    }

    @Patch("products/:id")
    @RequireAdmin()
    @ApiOperation({ summary: "Обновить товар (Admin)" })
    @ApiSuccessResponse(ProductDetailDto)
    @ApiErrorResponse([400, 401, 403, 404, 409])
    async updateProduct(
        @Param("id") id: string,
        @Body() dto: UpdateProductDto,
        @PortalId() portalId: string,
        @CurrentEmployee() employee: Employee
    ): Promise<ProductDetailDto> {
        const product = await this.productsService.update(id, dto, portalId, employee.id);
        return mapProductToDetailDto(product);
    }

    @Delete("products/:id")
    @RequireAdmin()
    @ApiOperation({ summary: "Удалить товар (Admin)" })
    @ApiErrorResponse([401, 403, 404])
    async deleteProduct(
        @Param("id") id: string,
        @PortalId() portalId: string
    ): Promise<{ message: string }> {
        await this.productsService.delete(id, portalId);
        return { message: "Product deleted successfully" };
    }

    // ─── Categories ──────────────────────────────────────────────────────────

    @Get("categories")
    @ApiOperation({ summary: "Список категорий (плоский)" })
    @ApiSuccessResponse(ProductCategoryDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async listCategories(@PortalId() portalId: string): Promise<ProductCategoryDto[]> {
        const cats = await this.categoriesService.findAll(portalId);
        return cats.map(mapCategoryToDto);
    }

    @Get("categories/tree")
    @ApiOperation({ summary: "Дерево категорий (иерархическое)" })
    @ApiSuccessResponse(ProductCategoryTreeDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async getCategoriesTree(@PortalId() portalId: string): Promise<ProductCategoryTreeDto[]> {
        const tree = await this.categoriesService.findTree(portalId);
        return tree.map(mapCategoryToTreeDto);
    }

    @Post("categories")
    @RequireAdmin()
    @ApiOperation({ summary: "Создать категорию (Admin)" })
    @ApiSuccessResponse(ProductCategoryDto, { status: 201 })
    @ApiErrorResponse([400, 401, 403, 404, 409])
    async createCategory(
        @Body() dto: CreateProductCategoryDto,
        @PortalId() portalId: string
    ): Promise<ProductCategoryDto> {
        const cat = await this.categoriesService.create(dto, portalId);
        return mapCategoryToDto(cat);
    }

    @Patch("categories/:id")
    @RequireAdmin()
    @ApiOperation({ summary: "Обновить категорию (Admin)" })
    @ApiSuccessResponse(ProductCategoryDto)
    @ApiErrorResponse([400, 401, 403, 404, 409])
    async updateCategory(
        @Param("id") id: string,
        @Body() dto: UpdateProductCategoryDto,
        @PortalId() portalId: string
    ): Promise<ProductCategoryDto> {
        const cat = await this.categoriesService.update(id, dto, portalId);
        return mapCategoryToDto(cat);
    }

    @Delete("categories/:id")
    @RequireAdmin()
    @ApiOperation({ summary: "Удалить категорию (Admin)" })
    @ApiErrorResponse([401, 403, 404])
    async deleteCategory(
        @Param("id") id: string,
        @PortalId() portalId: string
    ): Promise<{ message: string }> {
        await this.categoriesService.delete(id, portalId);
        return { message: "Category deleted successfully" };
    }

    // ─── Measurement Units ───────────────────────────────────────────────────

    @Get("measurement-units")
    @ApiOperation({ summary: "Список единиц измерения" })
    @ApiSuccessResponse(MeasurementUnitDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async listMeasurementUnits(): Promise<MeasurementUnitDto[]> {
        const units = await this.unitsService.findAll();
        return units.map(mapMeasurementUnitToDto);
    }

    @Post("measurement-units")
    @RequireAdmin()
    @ApiOperation({ summary: "Создать единицу измерения (Admin)" })
    @ApiSuccessResponse(MeasurementUnitDto, { status: 201 })
    @ApiErrorResponse([400, 401, 403, 409])
    async createMeasurementUnit(
        @Body() dto: CreateMeasurementUnitDto
    ): Promise<MeasurementUnitDto> {
        const unit = await this.unitsService.create(dto);
        return mapMeasurementUnitToDto(unit);
    }

    @Patch("measurement-units/:id")
    @RequireAdmin()
    @ApiOperation({ summary: "Обновить единицу измерения (Admin)" })
    @ApiSuccessResponse(MeasurementUnitDto)
    @ApiErrorResponse([400, 401, 403, 404, 409])
    async updateMeasurementUnit(
        @Param("id") id: string,
        @Body() dto: UpdateMeasurementUnitDto
    ): Promise<MeasurementUnitDto> {
        const unit = await this.unitsService.update(id, dto);
        return mapMeasurementUnitToDto(unit);
    }

    @Delete("measurement-units/:id")
    @RequireAdmin()
    @ApiOperation({ summary: "Удалить единицу измерения (Admin)" })
    @ApiErrorResponse([401, 403, 404])
    async deleteMeasurementUnit(@Param("id") id: string): Promise<{ message: string }> {
        await this.unitsService.delete(id);
        return { message: "Measurement unit deleted successfully" };
    }
}
