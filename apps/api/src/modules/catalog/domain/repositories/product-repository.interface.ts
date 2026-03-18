import { Prisma } from "@prisma/client";

type Decimal = Prisma.Decimal;

import { Product } from "@catalog/domain/entity/product.entity";

export interface ProductFilters {
    categoryId?: string;
    isActive?: boolean;
    isAvailable?: boolean;
    search?: string; // Поиск по name, sku, strain
    minPrice?: number;
    maxPrice?: number;
}

export abstract class ProductRepository {
    abstract findById(id: string): Promise<Product | null>;
    abstract findBySku(sku: string): Promise<Product | null>;
    abstract findAll(
        filters?: ProductFilters,
        limit?: number,
        skip?: number,
        sortBy?: string,
        sortOrder?: "asc" | "desc"
    ): Promise<Product[]>;
    abstract findActive(): Promise<Product[]>; // Только активные и доступные
    abstract count(filters?: ProductFilters): Promise<number>;
    abstract create(data: {
        categoryId: string;
        measurementUnitId: string;
        name: string;
        description?: string;
        sku?: string;
        price: Decimal;
        initialQuantity: Decimal;
        currentQuantity: Decimal;
        minQuantity?: Decimal;
        imageUrl?: string;
        thc?: Decimal;
        cbd?: Decimal;
        strain?: string;
        createdBy?: string;
    }): Promise<Product>;
    abstract update(
        id: string,
        data: Partial<{
            categoryId: string;
            measurementUnitId: string;
            name: string;
            description: string | null;
            sku: string | null;
            price: Decimal;
            initialQuantity: Decimal;
            currentQuantity: Decimal;
            minQuantity: Decimal | null;
            imageUrl: string | null;
            isActive: boolean;
            isAvailable: boolean;
            thc: Decimal | null;
            cbd: Decimal | null;
            strain: string | null;
            updatedBy: string;
        }>
    ): Promise<Product>;
    abstract delete(id: string): Promise<void>;
}
