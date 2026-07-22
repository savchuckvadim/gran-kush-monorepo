import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { PortalFieldType } from "@prisma/client";
import { Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsInt,
    IsObject,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    Min,
    ValidateNested,
} from "class-validator";

export class PortalFieldOptionInputDto {
    @ApiProperty({ type: String })
    @IsString()
    @MaxLength(120)
    @Matches(/^[a-z0-9_]+$/)
    valueKey: string;

    @ApiProperty({ type: String })
    @IsString()
    @MaxLength(255)
    label: string;

    @ApiPropertyOptional({ type: String, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(32)
    color?: string | null;

    @ApiPropertyOptional({ type: Number, default: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    sortOrder?: number;
}

export class CreatePortalMemberFieldDto {
    @ApiProperty({ type: String, example: "loyalty_tier" })
    @IsString()
    @MaxLength(120)
    @Matches(/^[a-z][a-z0-9_]*$/)
    fieldKey: string;

    @ApiProperty({ enum: PortalFieldType })
    @IsEnum(PortalFieldType)
    type: PortalFieldType;

    @ApiProperty({ type: String })
    @IsString()
    @MaxLength(255)
    label: string;

    @ApiPropertyOptional({ type: String, nullable: true })
    @IsOptional()
    @IsString()
    helpText?: string | null;

    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    isMultiple?: boolean;

    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    showInFilters?: boolean;

    @ApiPropertyOptional({ type: Number, default: 900 })
    @IsOptional()
    @IsInt()
    @Min(0)
    sortOrder?: number;

    @ApiPropertyOptional({ type: "object", additionalProperties: true })
    @IsOptional()
    @IsObject()
    validationJson?: Record<string, unknown>;

    @ApiPropertyOptional({ type: [PortalFieldOptionInputDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PortalFieldOptionInputDto)
    options?: PortalFieldOptionInputDto[];
}

export class UpdatePortalMemberFieldDto {
    @ApiPropertyOptional({ type: String, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    label?: string | null;

    @ApiPropertyOptional({ type: String, nullable: true })
    @IsOptional()
    @IsString()
    helpText?: string | null;

    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    showInFilters?: boolean;

    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    isMultiple?: boolean;

    @ApiPropertyOptional({ type: "object", additionalProperties: true })
    @IsOptional()
    @IsObject()
    validationJson?: Record<string, unknown> | null;

    @ApiPropertyOptional({ type: Number })
    @IsOptional()
    @IsInt()
    @Min(0)
    sortOrder?: number;
}

export class FormLayoutItemInputDto {
    @ApiProperty({ type: String })
    @IsString()
    fieldKey: string;

    @ApiProperty({ type: Number })
    @IsInt()
    @Min(0)
    sortOrder: number;

    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    required?: boolean;

    @ApiPropertyOptional({ type: Boolean, default: true })
    @IsOptional()
    @IsBoolean()
    visible?: boolean;

    @ApiPropertyOptional({ type: Boolean, default: false })
    @IsOptional()
    @IsBoolean()
    readOnly?: boolean;

    @ApiPropertyOptional({ type: String, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(80)
    sectionCode?: string | null;
}

export class UpdateMemberFormLayoutDto {
    @ApiProperty({ type: [FormLayoutItemInputDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => FormLayoutItemInputDto)
    items: FormLayoutItemInputDto[];
}
