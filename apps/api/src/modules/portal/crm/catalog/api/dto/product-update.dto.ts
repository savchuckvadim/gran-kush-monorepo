import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { ProductAudience } from "@prisma/client";
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    Matches,
    MaxLength,
    Min,
} from "class-validator";

import { Trimmed } from "@common/decorators/dto/trimmed.decorator";
import {
    PRODUCT_BARCODE_MAX_LENGTH,
    PRODUCT_BARCODE_SHAPE,
} from "@modules/portal/crm/catalog/domain/product-code";

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

    @ApiPropertyOptional({
        example: "8412345678905",
        type: String,
        nullable: true,
        description: "Штрихкод упаковки (EAN/UPC); уникален в клубе, null — убрать",
    })
    @IsOptional()
    @Trimmed()
    @IsString()
    @MaxLength(PRODUCT_BARCODE_MAX_LENGTH)
    @Matches(PRODUCT_BARCODE_SHAPE, {
        message: "barcode must be printable characters without spaces",
    })
    barcode?: string | null;

    @ApiPropertyOptional({
        example: false,
        type: Boolean,
        description: "Расходник: не продаётся, списывается по скану",
    })
    @IsOptional()
    @IsBoolean()
    isConsumable?: boolean;

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

    @ApiPropertyOptional({
        example: 500.0,
        type: Number,
        description:
            "Новый остаток: разница записывается движением «пересчёт» с причиной stockNote",
    })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 3 })
    @Min(0)
    currentQuantity?: number;

    @ApiPropertyOptional({
        type: String,
        example: "Инвентаризация",
        description: "Причина правки остатка",
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    stockNote?: string;

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
