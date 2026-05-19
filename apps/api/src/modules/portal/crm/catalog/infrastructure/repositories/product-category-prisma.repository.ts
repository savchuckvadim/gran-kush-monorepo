import { Injectable } from "@nestjs/common";

import { Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { ProductCategory } from "@modules/portal/crm/catalog/domain/entity/product-category.entity";
import { ProductCategoryRepository } from "@modules/portal/crm/catalog/domain/repositories/product-category-repository.interface";
import {
    PRODUCT_CATEGORY_FULL_INCLUDE,
    PRODUCT_CATEGORY_TREE_ROOT_INCLUDE,
    type ProductCategoryQueryRow,
} from "@modules/portal/crm/catalog/infrastructure/prisma-includes/product-category.include";

/** Скаляры строки категории из Prisma (без relations в payload). */
type CategoryScalarRow = Prisma.ProductCategoryGetPayload<Record<string, never>>;

/** Узел дерева категорий из Prisma (скаляры + опционально parent/children). */
type CategoryNode = CategoryScalarRow & {
    parent?: CategoryNode | null;
    children?: CategoryNode[];
};

@Injectable()
export class ProductCategoryPrismaRepository implements ProductCategoryRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findById(id: string): Promise<ProductCategory | null> {
        const cat = await this.prisma.productCategory.findUnique({
            where: { id },
            include: PRODUCT_CATEGORY_FULL_INCLUDE,
        });
        return cat ? this.mapToEntity(cat) : null;
    }

    async findByCode(code: string): Promise<ProductCategory | null> {
        const cat = await this.prisma.productCategory.findUnique({
            where: { code },
            include: PRODUCT_CATEGORY_FULL_INCLUDE,
        });
        return cat ? this.mapToEntity(cat) : null;
    }

    async findAll(onlyActive?: boolean): Promise<ProductCategory[]> {
        const cats = await this.prisma.productCategory.findMany({
            where: onlyActive ? { isActive: true } : undefined,
            include: PRODUCT_CATEGORY_FULL_INCLUDE,
            orderBy: { sortOrder: "asc" },
        });
        return cats.map((c) => this.mapToEntity(c));
    }

    async findTree(): Promise<ProductCategory[]> {
        const cats = await this.prisma.productCategory.findMany({
            where: { parentId: null, isActive: true },
            include: PRODUCT_CATEGORY_TREE_ROOT_INCLUDE,
            orderBy: { sortOrder: "asc" },
        });
        return cats.map((c) => this.mapToEntity(c));
    }

    async count(): Promise<number> {
        return this.prisma.productCategory.count();
    }

    async create(data: {
        code: string;
        name: string;
        description?: string;
        parentId?: string;
        sortOrder?: number;
    }): Promise<ProductCategory> {
        const cat = await this.prisma.productCategory.create({
            data,
            include: PRODUCT_CATEGORY_FULL_INCLUDE,
        });
        return this.mapToEntity(cat);
    }

    async update(
        id: string,
        data: Partial<{
            code: string;
            name: string;
            description: string | null;
            parentId: string | null;
            sortOrder: number;
            isActive: boolean;
        }>
    ): Promise<ProductCategory> {
        const cat = await this.prisma.productCategory.update({
            where: { id },
            data,
            include: PRODUCT_CATEGORY_FULL_INCLUDE,
        });
        return this.mapToEntity(cat);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.productCategory.delete({ where: { id } });
    }

    private mapToEntity(raw: ProductCategoryQueryRow): ProductCategory {
        return this.mapCategoryNode(raw as CategoryNode);
    }

    private mapCategoryNode(raw: CategoryNode): ProductCategory {
        const parent = raw.parent != null ? this.mapCategoryNode(raw.parent) : null;
        const children = raw.children?.map((c) => this.mapCategoryNode(c)) ?? [];
        return new ProductCategory({
            id: raw.id,
            code: raw.code,
            name: raw.name,
            description: raw.description,
            parentId: raw.parentId,
            sortOrder: raw.sortOrder,
            isActive: raw.isActive,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
            parent,
            children,
        });
    }
}
