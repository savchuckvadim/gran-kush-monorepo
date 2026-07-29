import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { StageSemantic } from "@prisma/client";
import { Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    Matches,
    MaxLength,
    Min,
    MinLength,
    ValidateNested,
} from "class-validator";

// ─── Стадии (воронки) ────────────────────────────────────────────────────────

export class StageInputDto {
    @ApiPropertyOptional({ type: String, format: "uuid", description: "Существующая стадия" })
    @IsOptional()
    @IsUUID()
    id?: string;

    @ApiProperty({ type: String, example: "In progress" })
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    name!: string;

    @ApiProperty({ type: Number })
    @IsInt()
    @Min(0)
    sortOrder!: number;

    @ApiPropertyOptional({ type: String, nullable: true, example: "#f59e0b" })
    @IsOptional()
    @IsString()
    @MaxLength(32)
    color?: string | null;

    @ApiProperty({ enum: StageSemantic })
    @IsEnum(StageSemantic)
    semantic!: StageSemantic;

    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    isTerminalSuccess?: boolean;

    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    isTerminalFailure?: boolean;
}

export class CreateStageCategoryDto {
    @ApiProperty({ type: String, example: "sales" })
    @IsString()
    @MinLength(1)
    @MaxLength(80)
    @Matches(/^[a-z][a-z0-9_]*$/)
    code!: string;

    @ApiProperty({ type: String, example: "Продажи" })
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    name!: string;

    @ApiProperty({ type: [StageInputDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => StageInputDto)
    stages!: StageInputDto[];
}

export class UpdateStageCategoryDto {
    @ApiPropertyOptional({ type: String })
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    name?: string;

    @ApiPropertyOptional({ type: [StageInputDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => StageInputDto)
    stages?: StageInputDto[];
}

// ─── Статусы ─────────────────────────────────────────────────────────────────

export class StatusItemInputDto {
    @ApiProperty({ type: String, example: "vip" })
    @IsString()
    @MinLength(1)
    @MaxLength(80)
    @Matches(/^[a-zA-Z][a-zA-Z0-9_]*$/)
    key!: string;

    @ApiProperty({ type: String, example: "VIP" })
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    label!: string;

    @ApiPropertyOptional({ type: String, nullable: true, example: "#22c55e" })
    @IsOptional()
    @IsString()
    @MaxLength(32)
    color?: string | null;

    @ApiPropertyOptional({ type: Number })
    @IsOptional()
    @IsInt()
    @Min(0)
    sortOrder?: number;
}

export class CreateStatusSetDto {
    @ApiProperty({ type: String, example: "custom" })
    @IsString()
    @MinLength(1)
    @MaxLength(80)
    @Matches(/^[a-z][a-z0-9_]*$/)
    code!: string;

    @ApiProperty({ type: [StatusItemInputDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => StatusItemInputDto)
    items!: StatusItemInputDto[];
}

export class UpdateStatusItemDto {
    @ApiPropertyOptional({ type: String })
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    label?: string;

    @ApiPropertyOptional({ type: String, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(32)
    color?: string | null;

    @ApiPropertyOptional({ type: Number })
    @IsOptional()
    @IsInt()
    @Min(0)
    sortOrder?: number;

    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class StatusItemResponseDto {
    @ApiProperty({ type: String })
    id!: string;

    @ApiProperty({ type: String })
    statusSetId!: string;

    @ApiProperty({ type: String })
    key!: string;

    @ApiProperty({ type: String })
    label!: string;

    @ApiProperty({ type: String, nullable: true })
    color!: string | null;

    @ApiProperty({ type: Number })
    sortOrder!: number;

    @ApiProperty({ type: Boolean })
    isActive!: boolean;

    @ApiProperty({ type: Boolean })
    isSystem!: boolean;

    @ApiProperty({ type: String, nullable: true })
    semantic!: string | null;
}

export class StatusSetResponseDto {
    @ApiProperty({ type: String })
    id!: string;

    @ApiProperty({ type: String })
    code!: string;

    @ApiProperty({ type: Boolean })
    isSystem!: boolean;

    @ApiProperty({ type: Boolean })
    isImmutable!: boolean;

    @ApiProperty({ type: [StatusItemResponseDto] })
    @Type(() => StatusItemResponseDto)
    items!: StatusItemResponseDto[];
}

export class DeleteResultDto {
    @ApiProperty({ type: Boolean })
    ok!: boolean;
}
