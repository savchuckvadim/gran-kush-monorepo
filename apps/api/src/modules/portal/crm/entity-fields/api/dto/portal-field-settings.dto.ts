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
    @ApiProperty()
    @IsString()
    @MaxLength(120)
    @Matches(/^[a-z0-9_]+$/)
    valueKey: string;

    @ApiProperty()
    @IsString()
    @MaxLength(255)
    label: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(32)
    color?: string | null;

    @ApiPropertyOptional({ default: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    sortOrder?: number;
}

export class CreatePortalMemberFieldDto {
    @ApiProperty({ example: "loyalty_tier" })
    @IsString()
    @MaxLength(120)
    @Matches(/^[a-z][a-z0-9_]*$/)
    fieldKey: string;

    @ApiProperty({ enum: PortalFieldType })
    @IsEnum(PortalFieldType)
    type: PortalFieldType;

    @ApiProperty()
    @IsString()
    @MaxLength(255)
    label: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    helpText?: string | null;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isMultiple?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    showInFilters?: boolean;

    @ApiPropertyOptional({ default: 900 })
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
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(255)
    label?: string | null;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    helpText?: string | null;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    showInFilters?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isMultiple?: boolean;

    @ApiPropertyOptional({ type: "object", additionalProperties: true })
    @IsOptional()
    @IsObject()
    validationJson?: Record<string, unknown> | null;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @Min(0)
    sortOrder?: number;
}

export class FormLayoutItemInputDto {
    @ApiProperty()
    @IsString()
    fieldKey: string;

    @ApiProperty()
    @IsInt()
    @Min(0)
    sortOrder: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    required?: boolean;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    visible?: boolean;

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @IsBoolean()
    readOnly?: boolean;

    @ApiPropertyOptional()
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
