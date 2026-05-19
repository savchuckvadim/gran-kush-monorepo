import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

// ─── Response DTO ────────────────────────────────────────────────────────────

export class MeasurementUnitDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    id: string;

    @ApiProperty({ example: "g", type: String, description: "Уникальный код единицы измерения" })
    code: string;

    @ApiProperty({ example: "Грамм", type: String, description: "Название единицы измерения" })
    name: string;

    @ApiPropertyOptional({
        example: "Единица массы",
        type: String,
        nullable: true,
        description: "Описание",
    })
    description?: string | null;

    @ApiProperty({ example: false, type: Boolean, description: "Кастомная единица измерения" })
    isCustom: boolean;

    @ApiProperty({ example: true, type: Boolean, description: "Активна ли единица" })
    isActive: boolean;

    @ApiProperty({ example: "2026-03-16T12:00:00.000Z", type: String })
    createdAt: string;

    @ApiProperty({ example: "2026-03-16T12:00:00.000Z", type: String })
    updatedAt: string;
}

// ─── Create DTO ──────────────────────────────────────────────────────────────

export class CreateMeasurementUnitDto {
    @ApiProperty({ example: "g", type: String, description: "Уникальный код единицы измерения" })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    code: string;

    @ApiProperty({ example: "Грамм", type: String, description: "Название единицы измерения" })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name: string;

    @ApiPropertyOptional({ example: "Единица массы", type: String })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ example: false, type: Boolean, default: false })
    @IsOptional()
    @IsBoolean()
    isCustom?: boolean;
}

// ─── Update DTO ──────────────────────────────────────────────────────────────

export class UpdateMeasurementUnitDto {
    @ApiPropertyOptional({ example: "g", type: String })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    code?: string;

    @ApiPropertyOptional({ example: "Грамм", type: String })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    name?: string;

    @ApiPropertyOptional({ example: "Единица массы", type: String, nullable: true })
    @IsOptional()
    @IsString()
    description?: string | null;

    @ApiPropertyOptional({ example: false, type: Boolean })
    @IsOptional()
    @IsBoolean()
    isCustom?: boolean;

    @ApiPropertyOptional({ example: true, type: Boolean })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
