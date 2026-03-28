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

import { RequireEmployeeJwt } from "@auth/employees";
import { CurrentEmployee } from "@auth/employees/api/decorators/current-employee.decorator";
import { AdminGuard } from "@auth/employees/infrastructure/guards/admin.guard";
import {
    CreateMeasurementUnitDto,
    MeasurementUnitDto,
    UpdateMeasurementUnitDto,
} from "@catalog/api/dto/measurement-unit.dto";
import {
    CreateProductDto,
    ProductDetailDto,
    ProductFilterDto,
    ProductListDto,
    UpdateProductDto,
} from "@catalog/api/dto/product.dto";
import {
    CreateProductCategoryDto,
    ProductCategoryDto,
    ProductCategoryTreeDto,
    UpdateProductCategoryDto,
} from "@catalog/api/dto/product-category.dto";
import {
    mapCategoryToDto,
    mapCategoryToTreeDto,
    mapMeasurementUnitToDto,
    mapProductToDetailDto,
    mapProductToListDto,
} from "@catalog/api/mappers";
import { MeasurementUnitsService } from "@catalog/application/services/measurement-units.service";
import { ProductCategoriesService } from "@catalog/application/services/product-categories.service";
import { ProductsService } from "@catalog/application/services/products.service";
import { Employee } from "@employees/domain/entity/employee.entity";

import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiPaginatedResponse } from "@common/decorators/response/api-paginated-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { PaginationDto } from "@common/paginate/dto/pagination.dto";
import { PaginatedResult } from "@common/paginate/interfaces/paginated-result.interface";
import { PaginationUtil } from "@common/paginate/utils/pagination.util";

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
        @Query() pagination: PaginationDto,
        @Query() filters: ProductFilterDto
    ): Promise<PaginatedResult<ProductListDto>> {
        const page = pagination.page ?? 1;
        const limit = pagination.limit ?? 10;
        const skip = PaginationUtil.getSkip(page, limit);

        const [products, total] = await Promise.all([
            this.productsService.findAll(
                filters,
                limit,
                skip,
                pagination.sortBy,
                pagination.sortOrder
            ),
            this.productsService.count(filters),
        ]);

        const items = products.map(mapProductToListDto);
        return PaginationUtil.createPaginatedResult(items, total, page, limit);
    }

    @Get("products/:id")
    @ApiOperation({ summary: "Детали товара" })
    @ApiSuccessResponse(ProductDetailDto)
    @ApiErrorResponse([401, 403, 404])
    async getProduct(@Param("id") id: string): Promise<ProductDetailDto> {
        const product = await this.productsService.findById(id);
        if (!product) {
            throw new NotFoundException("Product not found");
        }
        return mapProductToDetailDto(product);
    }

    @Post("products")
    @UseGuards(AdminGuard)
    @ApiOperation({ summary: "Создать товар (Admin)" })
    @ApiSuccessResponse(ProductDetailDto, { status: 201 })
    @ApiErrorResponse([400, 401, 403, 404, 409])
    async createProduct(
        @Body() dto: CreateProductDto,
        @CurrentEmployee() employee: Employee
    ): Promise<ProductDetailDto> {
        const product = await this.productsService.create(dto, employee.id);
        return mapProductToDetailDto(product);
    }

    @Patch("products/:id")
    @UseGuards(AdminGuard)
    @ApiOperation({ summary: "Обновить товар (Admin)" })
    @ApiSuccessResponse(ProductDetailDto)
    @ApiErrorResponse([400, 401, 403, 404, 409])
    async updateProduct(
        @Param("id") id: string,
        @Body() dto: UpdateProductDto,
        @CurrentEmployee() employee: Employee
    ): Promise<ProductDetailDto> {
        const product = await this.productsService.update(id, dto, employee.id);
        return mapProductToDetailDto(product);
    }

    @Delete("products/:id")
    @UseGuards(AdminGuard)
    @ApiOperation({ summary: "Удалить товар (Admin)" })
    @ApiErrorResponse([401, 403, 404])
    async deleteProduct(@Param("id") id: string): Promise<{ message: string }> {
        await this.productsService.delete(id);
        return { message: "Product deleted successfully" };
    }

    // ─── Categories ──────────────────────────────────────────────────────────

    @Get("categories")
    @ApiOperation({ summary: "Список категорий (плоский)" })
    @ApiSuccessResponse(ProductCategoryDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async listCategories(): Promise<ProductCategoryDto[]> {
        const cats = await this.categoriesService.findAll();
        return cats.map(mapCategoryToDto);
    }

    @Get("categories/tree")
    @ApiOperation({ summary: "Дерево категорий (иерархическое)" })
    @ApiSuccessResponse(ProductCategoryTreeDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async getCategoriesTree(): Promise<ProductCategoryTreeDto[]> {
        const tree = await this.categoriesService.findTree();
        return tree.map(mapCategoryToTreeDto);
    }

    @Post("categories")
    @UseGuards(AdminGuard)
    @ApiOperation({ summary: "Создать категорию (Admin)" })
    @ApiSuccessResponse(ProductCategoryDto, { status: 201 })
    @ApiErrorResponse([400, 401, 403, 404, 409])
    async createCategory(@Body() dto: CreateProductCategoryDto): Promise<ProductCategoryDto> {
        const cat = await this.categoriesService.create(dto);
        return mapCategoryToDto(cat);
    }

    @Patch("categories/:id")
    @UseGuards(AdminGuard)
    @ApiOperation({ summary: "Обновить категорию (Admin)" })
    @ApiSuccessResponse(ProductCategoryDto)
    @ApiErrorResponse([400, 401, 403, 404, 409])
    async updateCategory(
        @Param("id") id: string,
        @Body() dto: UpdateProductCategoryDto
    ): Promise<ProductCategoryDto> {
        const cat = await this.categoriesService.update(id, dto);
        return mapCategoryToDto(cat);
    }

    @Delete("categories/:id")
    @UseGuards(AdminGuard)
    @ApiOperation({ summary: "Удалить категорию (Admin)" })
    @ApiErrorResponse([401, 403, 404])
    async deleteCategory(@Param("id") id: string): Promise<{ message: string }> {
        await this.categoriesService.delete(id);
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
    @UseGuards(AdminGuard)
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
    @UseGuards(AdminGuard)
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
    @UseGuards(AdminGuard)
    @ApiOperation({ summary: "Удалить единицу измерения (Admin)" })
    @ApiErrorResponse([401, 403, 404])
    async deleteMeasurementUnit(@Param("id") id: string): Promise<{ message: string }> {
        await this.unitsService.delete(id);
        return { message: "Measurement unit deleted successfully" };
    }
}
