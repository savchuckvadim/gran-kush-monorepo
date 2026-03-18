import { ProductCategoryDto, ProductCategoryTreeDto } from "@catalog/api/dto/product-category.dto";
import { ProductCategory } from "@catalog/domain/entity/product-category.entity";

/**
 * Маппинг ProductCategory entity → ProductCategoryDto
 */
export function mapCategoryToDto(c: ProductCategory): ProductCategoryDto {
    return {
        id: c.id,
        code: c.code,
        name: c.name,
        description: c.description,
        parentId: c.parentId,
        sortOrder: c.sortOrder,
        isActive: c.isActive,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
    };
}

/**
 * Маппинг ProductCategory entity → ProductCategoryTreeDto (с children)
 */
export function mapCategoryToTreeDto(c: ProductCategory): ProductCategoryTreeDto {
    return {
        ...mapCategoryToDto(c),
        children: c.children?.map(mapCategoryToDto),
    };
}
