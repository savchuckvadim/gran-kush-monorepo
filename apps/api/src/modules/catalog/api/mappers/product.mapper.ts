import { ProductDetailDto, ProductListDto } from "@catalog/api/dto/product.dto";
import { Product } from "@catalog/domain/entity/product.entity";

/**
 * Маппинг Product entity → ProductListDto (для списка товаров)
 */
export function mapProductToListDto(p: Product): ProductListDto {
    return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        price: Number(p.price),
        currentQuantity: Number(p.currentQuantity),
        isActive: p.isActive,
        isAvailable: p.isAvailable,
        imageUrl: p.imageUrl,
        category: p.category
            ? {
                  id: p.category.id,
                  code: p.category.code,
                  name: p.category.name,
                  description: p.category.description,
                  parentId: p.category.parentId,
                  sortOrder: p.category.sortOrder,
                  isActive: p.category.isActive,
                  createdAt: p.category.createdAt.toISOString(),
                  updatedAt: p.category.updatedAt.toISOString(),
              }
            : (undefined as any),
        measurementUnit: p.measurementUnit
            ? {
                  id: p.measurementUnit.id,
                  code: p.measurementUnit.code,
                  name: p.measurementUnit.name,
                  description: p.measurementUnit.description,
                  isCustom: p.measurementUnit.isCustom,
                  isActive: p.measurementUnit.isActive,
                  createdAt: p.measurementUnit.createdAt.toISOString(),
                  updatedAt: p.measurementUnit.updatedAt.toISOString(),
              }
            : (undefined as any),
        createdAt: p.createdAt.toISOString(),
    };
}

/**
 * Маппинг Product entity → ProductDetailDto (для деталки товара)
 */
export function mapProductToDetailDto(p: Product): ProductDetailDto {
    return {
        ...mapProductToListDto(p),
        description: p.description,
        initialQuantity: Number(p.initialQuantity),
        minQuantity: p.minQuantity ? Number(p.minQuantity) : null,
        thc: p.thc ? Number(p.thc) : null,
        cbd: p.cbd ? Number(p.cbd) : null,
        strain: p.strain,
        images:
            p.images?.map((img) => ({
                id: img.id,
                storagePath: img.storagePath,
                sortOrder: img.sortOrder,
                isPrimary: img.isPrimary,
                createdAt: img.createdAt.toISOString(),
            })) ?? [],
        updatedAt: p.updatedAt.toISOString(),
    };
}
