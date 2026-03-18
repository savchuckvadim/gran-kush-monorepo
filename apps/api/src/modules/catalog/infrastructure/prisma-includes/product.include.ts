import { Prisma } from "@prisma/client";

/**
 * Стандартный include для загрузки продукта с категорией, ед. измерения и изображениями.
 */
export const PRODUCT_INCLUDE = {
    category: true,
    measurementUnit: true,
    images: { orderBy: { sortOrder: "asc" as const } },
} satisfies Prisma.ProductInclude;
