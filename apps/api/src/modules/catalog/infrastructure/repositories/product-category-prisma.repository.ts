import { Injectable } from "@nestjs/common";

import { ProductCategory } from "@catalog/domain/entity/product-category.entity";
import { ProductCategoryRepository } from "@catalog/domain/repositories/product-category-repository.interface";

import { PrismaService } from "@common/prisma/prisma.service";

@Injectable()
export class ProductCategoryPrismaRepository implements ProductCategoryRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findById(id: string): Promise<ProductCategory | null> {
        const cat = await this.prisma.productCategory.findUnique({
            where: { id },
            include: { parent: true, children: true },
        });
        return cat ? this.mapToEntity(cat) : null;
    }

    async findByCode(code: string): Promise<ProductCategory | null> {
        const cat = await this.prisma.productCategory.findUnique({
            where: { code },
            include: { parent: true, children: true },
        });
        return cat ? this.mapToEntity(cat) : null;
    }

    async findAll(onlyActive?: boolean): Promise<ProductCategory[]> {
        const cats = await this.prisma.productCategory.findMany({
            where: onlyActive ? { isActive: true } : undefined,
            include: { parent: true, children: true },
            orderBy: { sortOrder: "asc" },
        });
        return cats.map((c) => this.mapToEntity(c));
    }

    async findTree(): Promise<ProductCategory[]> {
        // Возвращаем только корневые категории с вложенными детьми
        const cats = await this.prisma.productCategory.findMany({
            where: { parentId: null, isActive: true },
            include: {
                children: {
                    where: { isActive: true },
                    orderBy: { sortOrder: "asc" },
                },
            },
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
            include: { parent: true, children: true },
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
            include: { parent: true, children: true },
        });
        return this.mapToEntity(cat);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.productCategory.delete({ where: { id } });
    }

    private mapToEntity(raw: any): ProductCategory {
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
            parent: raw.parent ? new ProductCategory(raw.parent) : null,
            children: raw.children?.map((c: any) => new ProductCategory(c)) ?? [],
        });
    }
}
