import { Prisma, ProductAudience } from "@prisma/client";

type Decimal = Prisma.Decimal;

import { MeasurementUnit } from "./measurement-unit.entity";
import { ProductCategory } from "./product-category.entity";
import { ProductImage } from "./product-image.entity";

/**
 * Domain Entity — Product (Товар)
 */
export class Product {
    id: string;
    portalId: string;
    categoryId: string;
    measurementUnitId: string;

    // Основная информация
    name: string;
    description?: string | null;
    sku?: string | null;
    /** Код QR-этикетки (TASK-807): уникален в клубе, выдаётся при создании */
    code: string;
    /** Штрихкод с упаковки поставщика; уникален в клубе */
    barcode?: string | null;
    /** Расходник: скан со стойки предлагает списание, а не заказ */
    isConsumable: boolean;

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

    /** Кому товар виден в кабинете; пусто — всем (`product-audience.ts`) */
    audiences: ProductAudience[];

    /** Граммы лимита участника на единицу товара; пусто — товар в лимит не входит */
    limitGramsPerUnit?: Decimal | null;

    /** Ставка налога (TASK-797); пусто — ставка клуба по умолчанию */
    taxRateId?: string | null;
    /** Цена с налогом; пусто — как в профиле организации */
    priceIncludesTax?: boolean | null;

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
