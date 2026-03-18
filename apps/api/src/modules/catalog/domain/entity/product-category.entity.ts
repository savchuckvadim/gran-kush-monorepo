/**
 * Domain Entity — ProductCategory (Категория товаров)
 */
export class ProductCategory {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    parentId?: string | null;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;

    // Relations (опционально загружаемые)
    parent?: ProductCategory | null;
    children?: ProductCategory[];

    constructor(partial: Partial<ProductCategory>) {
        Object.assign(this, partial);
    }
}
