import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";

import { ProductCategory } from "@modules/portal/crm/catalog/domain/entity/product-category.entity";
import { ProductCategoryRepository } from "@modules/portal/crm/catalog/domain/repositories/product-category-repository.interface";

@Injectable()
export class ProductCategoriesService {
    constructor(private readonly repository: ProductCategoryRepository) {}

    async findById(id: string, portalId: string): Promise<ProductCategory | null> {
        return this.repository.findById(id, portalId);
    }

    async findAll(portalId: string, onlyActive?: boolean): Promise<ProductCategory[]> {
        return this.repository.findAll(portalId, onlyActive);
    }

    async findTree(portalId: string): Promise<ProductCategory[]> {
        return this.repository.findTree(portalId);
    }

    async create(
        data: {
            code: string;
            name: string;
            description?: string;
            parentId?: string;
            sortOrder?: number;
        },
        portalId: string
    ): Promise<ProductCategory> {
        const existing = await this.repository.findByCode(data.code, portalId);
        if (existing) {
            throw new ConflictException(`Product category with code "${data.code}" already exists`);
        }

        if (data.parentId) {
            const parent = await this.repository.findById(data.parentId, portalId);
            if (!parent) {
                throw new NotFoundException("Parent category not found");
            }
        }

        return this.repository.create({ ...data, portalId });
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
        }>,
        portalId: string
    ): Promise<ProductCategory> {
        const category = await this.repository.findById(id, portalId);
        if (!category) {
            throw new NotFoundException("Product category not found");
        }

        if (data.code && data.code !== category.code) {
            const existing = await this.repository.findByCode(data.code, portalId);
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
            const parent = await this.repository.findById(data.parentId, portalId);
            if (!parent) {
                throw new NotFoundException("Parent category not found");
            }
        }

        return this.repository.update(id, data);
    }

    async delete(id: string, portalId: string): Promise<void> {
        const category = await this.repository.findById(id, portalId);
        if (!category) {
            throw new NotFoundException("Product category not found");
        }
        return this.repository.delete(id);
    }
}
