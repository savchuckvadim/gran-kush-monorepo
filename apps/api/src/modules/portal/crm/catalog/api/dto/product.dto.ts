import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { ProductAudience } from "@prisma/client";

import { MeasurementUnitDto } from "./measurement-unit.dto";
import { ProductCategoryDto } from "./product-category.dto";

// ─── Image DTO ───────────────────────────────────────────────────────────────

export class ProductImageDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    id: string;

    @ApiProperty({ example: "private/products/img.jpg", type: String })
    storagePath: string;

    @ApiProperty({ example: 0, type: Number })
    sortOrder: number;

    @ApiProperty({ example: true, type: Boolean })
    isPrimary: boolean;

    @ApiProperty({ example: "2026-03-16T12:00:00.000Z", type: String })
    createdAt: string;
}

// ─── Response — список ──────────────────────────────────────────────────────

export class ProductListDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    id: string;

    @ApiProperty({ example: "Producto A", type: String })
    name: string;

    @ApiPropertyOptional({ example: "SKU-001", type: String, nullable: true })
    sku?: string | null;

    @ApiProperty({ example: 15.5, type: Number })
    price: number;

    @ApiProperty({ example: 100.0, type: Number })
    currentQuantity: number;

    @ApiProperty({ example: true, type: Boolean })
    isActive: boolean;

    @ApiProperty({ example: true, type: Boolean })
    isAvailable: boolean;

    @ApiPropertyOptional({ example: "/storage/products/img.jpg", type: String, nullable: true })
    imageUrl?: string | null;

    @ApiPropertyOptional({ type: () => ProductCategoryDto })
    category?: ProductCategoryDto;

    @ApiPropertyOptional({ type: () => MeasurementUnitDto })
    measurementUnit?: MeasurementUnitDto;

    @ApiProperty({
        enum: ProductAudience,
        enumName: "ProductAudience",
        isArray: true,
        description: "Кому товар виден в кабинете; пусто — всем участникам",
    })
    audiences: ProductAudience[];

    @ApiPropertyOptional({
        example: 1,
        type: Number,
        nullable: true,
        description: "Граммы лимита на единицу",
    })
    limitGramsPerUnit: number | null;

    @ApiProperty({
        type: String,
        format: "uuid",
        nullable: true,
        description: "Ставка налога; null — ставка клуба по умолчанию",
    })
    taxRateId: string | null;

    @ApiProperty({
        type: Boolean,
        nullable: true,
        description: "Цена с налогом; null — как в профиле организации",
    })
    priceIncludesTax: boolean | null;

    @ApiProperty({ example: "2026-03-16T12:00:00.000Z", type: String })
    createdAt: string;
}

// ─── Response — деталка ─────────────────────────────────────────────────────

export class ProductDetailDto extends ProductListDto {
    @ApiPropertyOptional({ example: "Descripción del producto", type: String, nullable: true })
    description?: string | null;

    @ApiProperty({ example: 1000.0, type: Number })
    initialQuantity: number;

    @ApiPropertyOptional({ example: 10.0, type: Number, nullable: true })
    minQuantity?: number | null;

    @ApiPropertyOptional({ example: 22.5, type: Number, nullable: true })
    thc?: number | null;

    @ApiPropertyOptional({ example: 0.5, type: Number, nullable: true })
    cbd?: number | null;

    @ApiPropertyOptional({ example: "Variante A", type: String, nullable: true })
    strain?: string | null;

    @ApiProperty({ type: () => [ProductImageDto] })
    images: ProductImageDto[];

    @ApiProperty({ example: "2026-03-16T12:00:00.000Z", type: String })
    updatedAt: string;
}
