import type {
    SchemaCreateProductDto,
    SchemaPaginatedResponseProductListDto,
    SchemaProductDetailDto,
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
