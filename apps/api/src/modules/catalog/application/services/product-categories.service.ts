import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";

import { ProductCategory } from "@catalog/domain/entity/product-category.entity";
import { ProductCategoryRepository } from "@catalog/domain/repositories/product-category-repository.interface";

@Injectable()
export class ProductCategoriesService {
    constructor(private readonly repository: ProductCategoryRepository) {}

    async findById(id: string): Promise<ProductCategory | null> {
        return this.repository.findById(id);
    }

    async findAll(onlyActive?: boolean): Promise<ProductCategory[]> {
        return this.repository.findAll(onlyActive);
    }

    async findTree(): Promise<ProductCategory[]> {
        return this.repository.findTree();
    }

    async create(data: {
        code: string;
        name: string;
        description?: string;
        parentId?: string;
        sortOrder?: number;
    }): Promise<ProductCategory> {
        // Проверка уникальности code
        const existing = await this.repository.findByCode(data.code);
        if (existing) {
            throw new ConflictException(`Product category with code "${data.code}" already exists`);
        }

        // Проверка существования родительской категории
        if (data.parentId) {
            const parent = await this.repository.findById(data.parentId);
            if (!parent) {
                throw new NotFoundException("Parent category not found");
            }
        }

        return this.repository.create(data);
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
        const category = await this.repository.findById(id);
        if (!category) {
            throw new NotFoundException("Product category not found");
        }

        if (data.code && data.code !== category.code) {
            const existing = await this.repository.findByCode(data.code);
            if (existing) {
                throw new ConflictException(
                    `Product category with code "${data.code}" already exists`
                );
            }
        }

        if (data.parentId) {
            if (data.parentId === id) {
                throw new ConflictException("Category cannot be its own parent");
            }
            const parent = await this.repository.findById(data.parentId);
            if (!parent) {
                throw new NotFoundException("Parent category not found");
            }
        }

        return this.repository.update(id, data);
    }

    async delete(id: string): Promise<void> {
        const category = await this.repository.findById(id);
        if (!category) {
            throw new NotFoundException("Product category not found");
        }
        return this.repository.delete(id);
    }
}
