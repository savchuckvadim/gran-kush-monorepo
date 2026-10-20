import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { TaxTreatment } from "@prisma/client";
import { IsEnum, IsNumber, IsOptional, IsString, Length, Max, Min } from "class-validator";

import { IsQueryBoolean } from "@common/decorators/dto/query-boolean.decorator";

const TREATMENT = {
    enum: TaxTreatment,
    enumName: "TaxTreatment",
    description: "taxable — по ставке; exempt — exenta (art. 20 LIVA); not_subject — no sujeta",
} as const;

export class TaxRateDto {
    @ApiProperty({ type: String, format: "uuid" })
    id!: string;

    @ApiProperty({
        type: String,
        nullable: true,
        example: "es_general",
        description: "Код пресета: подпись переводит CRM. У своей ставки — null",
    })
    presetCode!: string | null;

    @ApiProperty({ type: String, nullable: true, example: null })
    name!: string | null;

    @ApiProperty({ type: Number, example: 21 })
    percent!: number;

    @ApiProperty({ ...TREATMENT, example: TaxTreatment.taxable })
    treatment!: TaxTreatment;

    @ApiProperty({ type: Boolean })
    isDefault!: boolean;

    @ApiProperty({ type: String, nullable: true, format: "date-time" })
    archivedAt!: string | null;
}

export class TaxRateListQueryDto {
    @ApiPropertyOptional({ type: Boolean, description: "Вместе с архивными" })
    @IsOptional()
    @IsQueryBoolean()
    includeArchived?: boolean;
}

export class CreateTaxRateDto {
    @ApiProperty({ type: String, example: "IVA 5 %" })
    @IsString()
    @Length(1, 80)
    name!: string;

    @ApiProperty({ type: Number, example: 5, minimum: 0, maximum: 100 })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @Max(100)
    percent!: number;

    @ApiProperty(TREATMENT)
    @IsEnum(TaxTreatment)
    treatment!: TaxTreatment;
}

export class UpdateTaxRateDto {
    @ApiPropertyOptional({
        type: String,
        nullable: true,
        description: "Своя подпись; null у пресета — вернуть подпись по коду",
    })
    @IsOptional()
    @IsString()
    @Length(1, 80)
    name?: string | null;

    @ApiPropertyOptional({ type: Number, minimum: 0, maximum: 100 })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @Max(100)
    percent?: number;

    @ApiPropertyOptional(TREATMENT)
    @IsOptional()
    @IsEnum(TaxTreatment)
    treatment?: TaxTreatment;
}
