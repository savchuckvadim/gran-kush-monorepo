import { ProductCategory } from "@catalog/domain/entity/product-category.entity";

export abstract class ProductCategoryRepository {
    abstract findById(id: string): Promise<ProductCategory | null>;
    abstract findByCode(code: string): Promise<ProductCategory | null>;
    abstract findAll(onlyActive?: boolean): Promise<ProductCategory[]>;
    abstract findTree(): Promise<ProductCategory[]>; // Иерархическое дерево
    abstract count(): Promise<number>;
    abstract create(data: {
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
