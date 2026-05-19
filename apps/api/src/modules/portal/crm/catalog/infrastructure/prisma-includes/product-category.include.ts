import { Prisma } from "@prisma/client";

export const PRODUCT_CATEGORY_FULL_INCLUDE = {
    parent: true,
    children: true,
} satisfies Prisma.ProductCategoryInclude;

export const PRODUCT_CATEGORY_TREE_ROOT_INCLUDE = {
    children: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" as const },
    },
} satisfies Prisma.ProductCategoryInclude;

export type ProductCategoryFullRow = Prisma.ProductCategoryGetPayload<{
    include: typeof PRODUCT_CATEGORY_FULL_INCLUDE;
}>;

export type ProductCategoryTreeRootRow = Prisma.ProductCategoryGetPayload<{
    include: typeof PRODUCT_CATEGORY_TREE_ROOT_INCLUDE;
}>;

export type ProductCategoryQueryRow = ProductCategoryFullRow | ProductCategoryTreeRootRow;
