import type {
    SchemaCreateProductCategoryDto,
    SchemaProductCategoryDto,
    SchemaProductCategoryTreeDto,
    SchemaUpdateProductCategoryDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

export async function getCategories(): Promise<SchemaProductCategoryDto[]> {
    const response = await $api.GET("/crm/catalog/categories");

    if (!response.response.ok) {
        throw new Error(`Failed to fetch categories: ${response.response.status}`);
    }

    return (response.data as SchemaProductCategoryDto[]) ?? [];
}

export async function getCategoriesTree(): Promise<SchemaProductCategoryTreeDto[]> {
    const response = await $api.GET("/crm/catalog/categories/tree");

    if (!response.response.ok) {
        throw new Error(`Failed to fetch categories tree: ${response.response.status}`);
    }

    return (response.data as SchemaProductCategoryTreeDto[]) ?? [];
}

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

export async function deleteCategory(id: string): Promise<void> {
    const response = await $api.DELETE("/crm/catalog/categories/{id}", {
        params: { path: { id } },
    });

    if (!response.response.ok) {
        throw new Error(`Failed to delete category: ${response.response.status}`);
    }
}
