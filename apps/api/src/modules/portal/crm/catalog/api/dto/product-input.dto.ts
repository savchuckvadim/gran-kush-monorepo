import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { ProductAudience } from "@prisma/client";
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    Min,
} from "class-validator";

// ─── Create DTO ──────────────────────────────────────────────────────────────

export class CreateProductDto {
    @ApiProperty({
        example: "550e8400-e29b-41d4-a716-446655440000",
        type: String,
        description: "ID категории",
    })
    @IsUUID()
    @IsNotEmpty()
    categoryId: string;

    @ApiProperty({
        example: "550e8400-e29b-41d4-a716-446655440000",
        type: String,
        description: "ID единицы измерения",
    })
    @IsUUID()
    @IsNotEmpty()
    measurementUnitId: string;

    @ApiProperty({ example: "Producto A", type: String })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name: string;

    @ApiPropertyOptional({ example: "Descripción del producto", type: String })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ example: "SKU-001", type: String })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    sku?: string;

    @ApiProperty({ example: 15.5, type: Number, description: "Цена за единицу" })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    price: number;

    @ApiProperty({ example: 1000.0, type: Number, description: "Начальное количество" })
    @IsNumber({ maxDecimalPlaces: 3 })
    @Min(0)
    initialQuantity: number;

    @ApiPropertyOptional({
        example: 10.0,
        type: Number,
        description: "Минимальный остаток для уведомления",
    })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 3 })
    @Min(0)
    minQuantity?: number;

    @ApiPropertyOptional({ example: "/storage/products/img.jpg", type: String })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    imageUrl?: string;

    @ApiPropertyOptional({ example: 22.5, type: Number })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    thc?: number;

    @ApiPropertyOptional({ example: 0.5, type: Number })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    cbd?: number;

    @ApiPropertyOptional({ example: "Variante A", type: String })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    strain?: string;

    @ApiPropertyOptional({
        enum: ProductAudience,
        enumName: "ProductAudience",
        isArray: true,
        description: "Кому товар виден в кабинете; пусто — всем участникам",
    })
    @IsOptional()
    @IsArray()
    @IsEnum(ProductAudience, { each: true })
    audiences?: ProductAudience[];

    @ApiPropertyOptional({
        example: 1,
        type: Number,
        description: "Граммы лимита участника на единицу товара; пусто — в лимит не входит",
    })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 3 })
    @Min(0)
    limitGramsPerUnit?: number;

    @ApiPropertyOptional({
        type: String,
        format: "uuid",
        nullable: true,
        description: "Ставка налога клуба (TASK-797); пусто — ставка по умолчанию",
    })
    @IsOptional()
    @IsUUID()
    taxRateId?: string | null;

    @ApiPropertyOptional({
        type: Boolean,
        nullable: true,
        description:
            "true — цена с налогом, false — налог сверху; пусто — как в профиле организации",
    })
    @IsOptional()
    @IsBoolean()
    priceIncludesTax?: boolean | null;
}

// ─── Update DTO ──────────────────────────────────────────────────────────────

export class UpdateProductDto {
    @ApiPropertyOptional({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @ApiPropertyOptional({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    @IsOptional()
    @IsUUID()
    measurementUnitId?: string;

    @ApiPropertyOptional({ example: "Producto A", type: String })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    name?: string;

    @ApiPropertyOptional({ example: "Descripción del producto", type: String, nullable: true })
    @IsOptional()
    @IsString()
    description?: string | null;

    @ApiPropertyOptional({ example: "SKU-001", type: String, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    sku?: string | null;

    @ApiPropertyOptional({ example: 15.5, type: Number })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    price?: number;

    @ApiPropertyOptional({ example: 1000.0, type: Number })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 3 })
    @Min(0)
    initialQuantity?: number;

    @ApiPropertyOptional({ example: 500.0, type: Number })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 3 })
    @Min(0)
    currentQuantity?: number;

    @ApiPropertyOptional({ example: 10.0, type: Number, nullable: true })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 3 })
    @Min(0)
    minQuantity?: number | null;

    @ApiPropertyOptional({ example: "/storage/products/img.jpg", type: String, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    imageUrl?: string | null;

    @ApiPropertyOptional({ example: true, type: Boolean })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ example: true, type: Boolean })
    @IsOptional()
    @IsBoolean()
    isAvailable?: boolean;

    @ApiPropertyOptional({ example: 22.5, type: Number, nullable: true })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    thc?: number | null;

    @ApiPropertyOptional({ example: 0.5, type: Number, nullable: true })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    cbd?: number | null;

    @ApiPropertyOptional({ example: "Variante A", type: String, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    strain?: string | null;

    @ApiPropertyOptional({
        enum: ProductAudience,
        enumName: "ProductAudience",
        isArray: true,
        description: "Кому товар виден в кабинете; пусто — всем участникам",
    })
    @IsOptional()
    @IsArray()
    @IsEnum(ProductAudience, { each: true })
    audiences?: ProductAudience[];

    @ApiPropertyOptional({
        example: 1,
        type: Number,
        nullable: true,
        description: "Граммы лимита участника на единицу товара; пусто — в лимит не входит",
    })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 3 })
    @Min(0)
    limitGramsPerUnit?: number | null;

    @ApiPropertyOptional({
        type: String,
        format: "uuid",
        nullable: true,
        description: "Ставка налога клуба (TASK-797); пусто — ставка по умолчанию",
    })
    @IsOptional()
    @IsUUID()
    taxRateId?: string | null;

    @ApiPropertyOptional({
        type: Boolean,
        nullable: true,
        description:
            "true — цена с налогом, false — налог сверху; пусто — как в профиле организации",
    })
    @IsOptional()
    @IsBoolean()
    priceIncludesTax?: boolean | null;
}
