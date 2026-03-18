import type {
    SchemaCreateMeasurementUnitDto,
    SchemaCreateProductCategoryDto,
    SchemaCreateProductDto,
    SchemaMeasurementUnitDto,
    SchemaPaginatedResponseProductListDto,
    SchemaProductCategoryDto,
    SchemaProductCategoryTreeDto,
    SchemaProductDetailDto,
    SchemaProductListDto,
    SchemaUpdateMeasurementUnitDto,
    SchemaUpdateProductCategoryDto,
    SchemaUpdateProductDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

// ═══════════════════════════════════════════════════════════════════════════════
// Products
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProductsFilter {
    categoryId?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
}

/**
 * Список товаров (с фильтрами и пагинацией)
 */
export async function getProducts(
    filters?: ProductsFilter
): Promise<SchemaPaginatedResponseProductListDto> {
    const response = await $api.GET("/crm/catalog/products", {
        params: {
            query: {
                categoryId: filters?.categoryId,
                isActive: filters?.isActive,
                search: filters?.search,
                page: filters?.page ?? 1,
                limit: filters?.limit ?? 20,
            },
        },
    });

    if (!response.response.ok) {
        throw new Error(`Failed to fetch products: ${response.response.status}`);
    }

    return response.data as SchemaPaginatedResponseProductListDto;
}

/**
 * Детали товара
 */
export async function getProductById(id: string): Promise<SchemaProductDetailDto> {
    const response = await $api.GET("/crm/catalog/products/{id}", {
        params: { path: { id } },
    });

    if (!response.response.ok) {
        throw new Error(`Failed to fetch product: ${response.response.status}`);
    }

    return response.data as SchemaProductDetailDto;
}

/**
 * Создать товар
 */
export async function createProduct(
    data: SchemaCreateProductDto
): Promise<SchemaProductDetailDto> {
    const response = await $api.POST("/crm/catalog/products", {
        body: data,
    });

    if (!response.response.ok) {
        throw new Error(`Failed to create product: ${response.response.status}`);
    }

    return response.data as SchemaProductDetailDto;
}

/**
 * Обновить товар
 */
export async function updateProduct(
    id: string,
    data: SchemaUpdateProductDto
): Promise<SchemaProductDetailDto> {
    const response = await $api.PATCH("/crm/catalog/products/{id}", {
        params: { path: { id } },
        body: data,
    });

    if (!response.response.ok) {
        throw new Error(`Failed to update product: ${response.response.status}`);
    }

    return response.data as SchemaProductDetailDto;
}

/**
 * Удалить товар
 */
export async function deleteProduct(id: string): Promise<void> {
    const response = await $api.DELETE("/crm/catalog/products/{id}", {
        params: { path: { id } },
    });

    if (!response.response.ok) {
        throw new Error(`Failed to delete product: ${response.response.status}`);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Categories
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Список категорий (плоский)
 */
export async function getCategories(): Promise<SchemaProductCategoryDto[]> {
    const response = await $api.GET("/crm/catalog/categories");

    if (!response.response.ok) {
        throw new Error(`Failed to fetch categories: ${response.response.status}`);
    }

    return (response.data as SchemaProductCategoryDto[]) ?? [];
}

/**
 * Дерево категорий
 */
export async function getCategoriesTree(): Promise<SchemaProductCategoryTreeDto[]> {
    const response = await $api.GET("/crm/catalog/categories/tree");

    if (!response.response.ok) {
        throw new Error(`Failed to fetch categories tree: ${response.response.status}`);
    }

    return (response.data as SchemaProductCategoryTreeDto[]) ?? [];
}

/**
 * Создать категорию
 */
export async function createCategory(
    data: SchemaCreateProductCategoryDto
): Promise<SchemaProductCategoryDto> {
    const response = await $api.POST("/crm/catalog/categories", {
        body: data,
    });

    if (!response.response.ok) {
        throw new Error(`Failed to create category: ${response.response.status}`);
    }

    return response.data as SchemaProductCategoryDto;
}

/**
 * Обновить категорию
 */
export async function updateCategory(
    id: string,
    data: SchemaUpdateProductCategoryDto
): Promise<SchemaProductCategoryDto> {
    const response = await $api.PATCH("/crm/catalog/categories/{id}", {
        params: { path: { id } },
        body: data,
    });

    if (!response.response.ok) {
        throw new Error(`Failed to update category: ${response.response.status}`);
    }

    return response.data as SchemaProductCategoryDto;
}

/**
 * Удалить категорию
 */
export async function deleteCategory(id: string): Promise<void> {
    const response = await $api.DELETE("/crm/catalog/categories/{id}", {
        params: { path: { id } },
    });

    if (!response.response.ok) {
        throw new Error(`Failed to delete category: ${response.response.status}`);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Measurement Units
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Список единиц измерения
 */
export async function getMeasurementUnits(): Promise<SchemaMeasurementUnitDto[]> {
    const response = await $api.GET("/crm/catalog/measurement-units");

    if (!response.response.ok) {
        throw new Error(`Failed to fetch measurement units: ${response.response.status}`);
    }

    return (response.data as SchemaMeasurementUnitDto[]) ?? [];
}

/**
 * Создать единицу измерения
 */
export async function createMeasurementUnit(
    data: SchemaCreateMeasurementUnitDto
): Promise<SchemaMeasurementUnitDto> {
    const response = await $api.POST("/crm/catalog/measurement-units", {
        body: data,
    });

    if (!response.response.ok) {
        throw new Error(`Failed to create measurement unit: ${response.response.status}`);
    }

    return response.data as SchemaMeasurementUnitDto;
}

/**
 * Обновить единицу измерения
 */
export async function updateMeasurementUnit(
    id: string,
    data: SchemaUpdateMeasurementUnitDto
): Promise<SchemaMeasurementUnitDto> {
    const response = await $api.PATCH("/crm/catalog/measurement-units/{id}", {
        params: { path: { id } },
        body: data,
    });

    if (!response.response.ok) {
        throw new Error(`Failed to update measurement unit: ${response.response.status}`);
    }

    return response.data as SchemaMeasurementUnitDto;
}
