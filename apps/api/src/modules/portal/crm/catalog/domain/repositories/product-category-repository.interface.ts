import { ProductCategory } from "@modules/portal/crm/catalog/domain/entity/product-category.entity";

export abstract class ProductCategoryRepository {
    abstract findById(id: string, portalId: string): Promise<ProductCategory | null>;
    abstract findByCode(code: string, portalId: string): Promise<ProductCategory | null>;
    abstract findAll(portalId: string, onlyActive?: boolean): Promise<ProductCategory[]>;
    abstract findTree(portalId: string): Promise<ProductCategory[]>;
    abstract count(portalId: string): Promise<number>;
    abstract create(data: {
        portalId: string;
        code: string;
        name: string;
        description?: string;
        parentId?: string;
        sortOrder?: number;
    }): Promise<ProductCategory>;
    abstract update(
        id: string,
        data: Partial<{
            code: string;
            name: string;
            description: string | null;
            parentId: string | null;
            sortOrder: number;
            isActive: boolean;
        }>
    ): Promise<ProductCategory>;
    abstract delete(id: string): Promise<void>;
}
