import { Prisma } from "@prisma/client";

type Decimal = Prisma.Decimal;

import { MeasurementUnit } from "./measurement-unit.entity";
import { ProductCategory } from "./product-category.entity";
import { ProductImage } from "./product-image.entity";

/**
 * Domain Entity — Product (Товар)
 */
export class Product {
    id: string;
    categoryId: string;
    measurementUnitId: string;

    // Основная информация
    name: string;
    description?: string | null;
    sku?: string | null;

    // Цена и количество
    price: Decimal;
    initialQuantity: Decimal;
    currentQuantity: Decimal;
    minQuantity?: Decimal | null;

    // Изображения
    imageUrl?: string | null;

    // Статусы
    isActive: boolean;
    isAvailable: boolean;

    // Метаданные
    thc?: Decimal | null;
    cbd?: Decimal | null;
    strain?: string | null;

    createdAt: Date;
    updatedAt: Date;
    createdBy?: string | null;
    updatedBy?: string | null;

    // Relations (опционально загружаемые)
    category?: ProductCategory;
    measurementUnit?: MeasurementUnit;
    images?: ProductImage[];

    constructor(partial: Partial<Product>) {
        Object.assign(this, partial);
    }
}
