import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { Type } from "class-transformer";
import {
    IsBoolean,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    Min,
} from "class-validator";

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

    @ApiProperty({ example: "OG Kush", type: String })
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

    @ApiProperty({ type: () => ProductCategoryDto })
    category: ProductCategoryDto;

    @ApiProperty({ type: () => MeasurementUnitDto })
    measurementUnit: MeasurementUnitDto;

    @ApiProperty({ example: "2026-03-16T12:00:00.000Z", type: String })
    createdAt: string;
}

// ─── Response — деталка ─────────────────────────────────────────────────────

export class ProductDetailDto extends ProductListDto {
    @ApiPropertyOptional({ example: "Классический сорт", type: String, nullable: true })
    description?: string | null;

    @ApiProperty({ example: 1000.0, type: Number })
    initialQuantity: number;

    @ApiPropertyOptional({ example: 10.0, type: Number, nullable: true })
    minQuantity?: number | null;

    @ApiPropertyOptional({ example: 22.5, type: Number, nullable: true })
    thc?: number | null;

    @ApiPropertyOptional({ example: 0.5, type: Number, nullable: true })
    cbd?: number | null;

    @ApiPropertyOptional({ example: "Indica", type: String, nullable: true })
    strain?: string | null;

    @ApiProperty({ type: () => [ProductImageDto] })
    images: ProductImageDto[];

    @ApiProperty({ example: "2026-03-16T12:00:00.000Z", type: String })
    updatedAt: string;
}

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

    @ApiProperty({ example: "OG Kush", type: String })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name: string;

    @ApiPropertyOptional({ example: "Классический сорт", type: String })
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

    @ApiPropertyOptional({ example: "Indica", type: String })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    strain?: string;
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

    @ApiPropertyOptional({ example: "OG Kush", type: String })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    name?: string;

    @ApiPropertyOptional({ example: "Классический сорт", type: String, nullable: true })
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

    @ApiPropertyOptional({ example: "Indica", type: String, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    strain?: string | null;
}

// ─── Filter DTO ──────────────────────────────────────────────────────────────

export class ProductFilterDto {
    @ApiPropertyOptional({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @ApiPropertyOptional({ example: true, type: Boolean })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ example: true, type: Boolean })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isAvailable?: boolean;

    @ApiPropertyOptional({
        example: "OG Kush",
        type: String,
        description: "Поиск по name, sku, strain",
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ example: 5.0, type: Number, description: "Минимальная цена" })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    minPrice?: number;

    @ApiPropertyOptional({ example: 100.0, type: Number, description: "Максимальная цена" })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    maxPrice?: number;
}
