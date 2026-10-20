import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { TaxTreatment } from "@prisma/client";
import { IsEnum, IsIn, IsOptional, IsString, Length, Matches } from "class-validator";

import { IsQueryBoolean } from "@common/decorators/dto/query-boolean.decorator";

const DIRECTIONS = ["income", "expense"] as const;
const TREATMENT = {
    enum: TaxTreatment,
    enumName: "TaxTreatment",
    nullable: true,
    description: "Налог проводок статьи по умолчанию; null — ставка клуба",
} as const;
const PGC_ACCOUNT = /^[0-9]{2,10}$/;

export class FinanceCategoryDto {
    @ApiProperty({ type: String, format: "uuid" })
    id!: string;

    @ApiProperty({
        type: String,
        example: "rent",
        description: "Код: подпись пресета переводит CRM, по нему импорт",
    })
    code!: string;

    @ApiProperty({ type: String, nullable: true, description: "Своё название; у пресета — null" })
    name!: string | null;

    @ApiProperty({ enum: DIRECTIONS, enumName: "CategoryDirection" })
    direction!: "income" | "expense";

    @ApiProperty({ type: String, nullable: true, example: "621" })
    pgcAccount!: string | null;

    @ApiProperty(TREATMENT)
    taxTreatment!: TaxTreatment | null;

    @ApiProperty({ type: Boolean })
    isPreset!: boolean;

    @ApiProperty({ type: String, format: "date-time", nullable: true })
    archivedAt!: string | null;
}

export class FinanceCategoryListQueryDto {
    @ApiPropertyOptional({ type: Boolean, description: "Вместе с архивными" })
    @IsOptional()
    @IsQueryBoolean()
    includeArchived?: boolean;
}

export class CreateFinanceCategoryDto {
    @ApiProperty({ type: String, example: "Seguridad privada" })
    @IsString()
    @Length(1, 80)
    name!: string;

    @ApiProperty({ enum: DIRECTIONS, enumName: "CategoryDirection" })
    @IsIn(DIRECTIONS)
    direction!: "income" | "expense";

    @ApiPropertyOptional({ type: String, nullable: true, example: "629" })
    @IsOptional()
    @Matches(PGC_ACCOUNT)
    pgcAccount?: string | null;

    @ApiPropertyOptional(TREATMENT)
    @IsOptional()
    @IsEnum(TaxTreatment)
    taxTreatment?: TaxTreatment | null;
}

export class UpdateFinanceCategoryDto {
    @ApiPropertyOptional({
        type: String,
        nullable: true,
        description: "null у пресета — вернуть подпись по коду",
    })
    @IsOptional()
    @IsString()
    @Length(1, 80)
    name?: string | null;

    @ApiPropertyOptional({ type: String, nullable: true })
    @IsOptional()
    @Matches(PGC_ACCOUNT)
    pgcAccount?: string | null;

    @ApiPropertyOptional(TREATMENT)
    @IsOptional()
    @IsEnum(TaxTreatment)
    taxTreatment?: TaxTreatment | null;
}
