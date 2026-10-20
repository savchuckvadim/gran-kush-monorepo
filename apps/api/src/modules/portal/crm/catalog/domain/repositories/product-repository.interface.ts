import { Prisma, ProductAudience } from "@prisma/client";

type Decimal = Prisma.Decimal;

import type { EventsOf, NewDomainEvent } from "@modules/events";
import { Product } from "@modules/portal/crm/catalog/domain/entity/product.entity";

export interface ProductFilters {
    categoryId?: string;
    isActive?: boolean;
    isAvailable?: boolean;
    search?: string; // Поиск по name, sku, strain, коду этикетки и штрихкоду
    /** `false` — без расходников: их не продают (подбор товара в заказ) */
    isConsumable?: boolean;
    minPrice?: number;
    maxPrice?: number;
}

/** Товар при создании; код этикетки выдаёт репозиторий (`newProductCode`). */
export interface NewProductData {
    portalId: string;
    categoryId: string;
    measurementUnitId: string;
    name: string;
    description?: string;
    sku?: string;
    barcode?: string | null;
    isConsumable?: boolean;
    price: Decimal;
    initialQuantity: Decimal;
    currentQuantity: Decimal;
    minQuantity?: Decimal;
    imageUrl?: string;
    thc?: Decimal;
    cbd?: Decimal;
    strain?: string;
    audiences?: ProductAudience[];
    limitGramsPerUnit?: Decimal;
    taxRateId?: string | null;
    priceIncludesTax?: boolean | null;
    createdBy?: string;
}

export abstract class ProductRepository {
    abstract findById(id: string, portalId: string): Promise<Product | null>;
    abstract findBySku(sku: string, portalId: string): Promise<Product | null>;
    abstract findByCode(code: string, portalId: string): Promise<Product | null>;
    abstract findByBarcode(barcode: string, portalId: string): Promise<Product | null>;
    abstract findAll(
        portalId: string,
        filters?: ProductFilters,
        limit?: number,
        skip?: number,
        sortBy?: string,
        sortOrder?: "asc" | "desc"
    ): Promise<Product[]>;
    /** Активные и доступные; `audiences` — только товары, видимые участнику этих аудиторий. */
    abstract findActive(portalId: string, audiences?: ProductAudience[]): Promise<Product[]>;
    abstract count(portalId: string, filters?: ProductFilters): Promise<number>;
    /** События пишутся в outbox той же транзакцией, что и товар (TASK-780) */
    abstract create(data: NewProductData, events?: EventsOf<Product>): Promise<Product>;
    abstract update(
        id: string,
        data: Partial<{
            categoryId: string;
            measurementUnitId: string;
            name: string;
            description: string | null;
            sku: string | null;
            barcode: string | null;
            isConsumable: boolean;
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
            audiences: ProductAudience[];
            limitGramsPerUnit: Decimal | null;
            taxRateId: string | null;
            priceIncludesTax: boolean | null;
            updatedBy: string;
        }>,
        events?: readonly NewDomainEvent[]
    ): Promise<Product>;
    abstract delete(id: string, events?: readonly NewDomainEvent[]): Promise<void>;
}
