import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { Type } from "class-transformer";
import {
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    Min,
} from "class-validator";

// ─── Response DTO ────────────────────────────────────────────────────────────

export class ProductCategoryDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    id: string;

    @ApiProperty({ example: "flower", type: String, description: "Уникальный код категории" })
    code: string;

    @ApiProperty({ example: "Цветы", type: String, description: "Название категории" })
    name: string;

    @ApiPropertyOptional({ example: "Категория цветочной продукции", type: String, nullable: true })
    description?: string | null;

    @ApiPropertyOptional({
        example: "550e8400-e29b-41d4-a716-446655440000",
        type: String,
        nullable: true,
    })
    parentId?: string | null;

    @ApiProperty({ example: 0, type: Number, description: "Порядок сортировки" })
    sortOrder: number;

    @ApiProperty({ example: true, type: Boolean })
    isActive: boolean;

    @ApiProperty({ example: "2026-03-16T12:00:00.000Z", type: String })
    createdAt: string;

    @ApiProperty({ example: "2026-03-16T12:00:00.000Z", type: String })
    updatedAt: string;
}

export class ProductCategoryTreeDto extends ProductCategoryDto {
    @ApiPropertyOptional({ type: () => [ProductCategoryDto], description: "Дочерние категории" })
    children?: ProductCategoryDto[];
}

// ─── Create DTO ──────────────────────────────────────────────────────────────

export class CreateProductCategoryDto {
    @ApiProperty({ example: "flower", type: String })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    code: string;

    @ApiProperty({ example: "Цветы", type: String })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name: string;

    @ApiPropertyOptional({ example: "Категория цветочной продукции", type: String })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    @IsOptional()
    @IsUUID()
    parentId?: string;

    @ApiPropertyOptional({ example: 0, type: Number, default: 0 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    sortOrder?: number;
}

// ─── Update DTO ──────────────────────────────────────────────────────────────

export class UpdateProductCategoryDto {
    @ApiPropertyOptional({ example: "flower", type: String })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    code?: string;

    @ApiPropertyOptional({ example: "Цветы", type: String })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    name?: string;

    @ApiPropertyOptional({ example: "Категория цветочной продукции", type: String, nullable: true })
    @IsOptional()
    @IsString()
    description?: string | null;

    @ApiPropertyOptional({
        example: "550e8400-e29b-41d4-a716-446655440000",
        type: String,
        nullable: true,
    })
    @IsOptional()
    @IsUUID()
    parentId?: string | null;

    @ApiPropertyOptional({ example: 0, type: Number })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    sortOrder?: number;

    @ApiPropertyOptional({ example: true, type: Boolean })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
