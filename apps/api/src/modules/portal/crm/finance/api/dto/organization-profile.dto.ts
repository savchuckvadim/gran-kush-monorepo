import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { IncomeTaxRegime, LegalForm, VatRegime } from "@prisma/client";
import {
    IsBoolean,
    IsEmail,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Length,
    Max,
    MaxLength,
    Min,
    ValidateIf,
} from "class-validator";

/** Налоговые настройки — общие для ответа и запроса. */
class OrganizationTaxFieldsDto {
    @ApiProperty({ enum: LegalForm, enumName: "LegalForm" })
    @IsEnum(LegalForm)
    legalForm!: LegalForm;

    @ApiProperty({ enum: VatRegime, enumName: "VatRegime" })
    @IsEnum(VatRegime)
    vatRegime!: VatRegime;

    @ApiProperty({ enum: IncomeTaxRegime, enumName: "IncomeTaxRegime" })
    @IsEnum(IncomeTaxRegime)
    incomeTaxRegime!: IncomeTaxRegime;

    @ApiProperty({ type: Boolean, description: "Цены каталога по умолчанию включают налог" })
    @IsBoolean()
    pricesIncludeTax!: boolean;

    @ApiProperty({ type: Number, minimum: 1, maximum: 12, example: 1 })
    @IsInt()
    @Min(1)
    @Max(12)
    fiscalYearStartMonth!: number;
}

/** Реквизиты: в ответе пустое — `null`, в запросе — `null` или нет поля. */
class OrganizationIdentityFieldsDto extends OrganizationTaxFieldsDto {
    @ApiPropertyOptional({ type: String, nullable: true, example: "Asociación Cannábica Sol" })
    @IsOptional()
    @IsString()
    @Length(1, 200)
    legalName?: string | null;

    @ApiPropertyOptional({ type: String, nullable: true, example: "PafPaf Sol" })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    tradeName?: string | null;

    @ApiPropertyOptional({ type: String, nullable: true, example: "G12345674" })
    @IsOptional()
    @IsString()
    @MaxLength(20)
    taxId?: string | null;

    @ApiPropertyOptional({ type: String, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(300)
    addressLine?: string | null;

    @ApiPropertyOptional({ type: String, nullable: true, example: "08001" })
    @IsOptional()
    @IsString()
    @MaxLength(12)
    postalCode?: string | null;

    @ApiPropertyOptional({ type: String, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(120)
    city?: string | null;

    @ApiPropertyOptional({ type: String, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(120)
    province?: string | null;

    @ApiPropertyOptional({ type: String, nullable: true, example: "ES9121000418450200051332" })
    @IsOptional()
    @IsString()
    @MaxLength(42)
    iban?: string | null;

    @ApiPropertyOptional({ type: String, nullable: true })
    @IsOptional()
    @ValidateIf((_, value) => value !== null && value !== "")
    @IsEmail()
    email?: string | null;

    @ApiPropertyOptional({ type: String, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(40)
    phone?: string | null;

    @ApiPropertyOptional({ type: String, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    gestorName?: string | null;

    @ApiPropertyOptional({ type: String, nullable: true })
    @IsOptional()
    @ValidateIf((_, value) => value !== null && value !== "")
    @IsEmail()
    gestorEmail?: string | null;

    @ApiPropertyOptional({ type: String, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(40)
    gestorPhone?: string | null;
}

export class UpdateOrganizationProfileDto extends OrganizationIdentityFieldsDto {
    @ApiProperty({ type: String, example: "Asociación Cannábica Sol" })
    @IsString()
    @Length(2, 200)
    declare legalName: string;
}

export class OrganizationProfileDto extends OrganizationIdentityFieldsDto {
    @ApiProperty({ type: Boolean, description: "Профиль сохранён; false — пресет типа портала" })
    configured!: boolean;

    @ApiProperty({ type: String, example: "ES" })
    country!: string;

    @ApiProperty({ type: String, example: "EUR" })
    currency!: string;

    @ApiProperty({ type: String, nullable: true, format: "date-time" })
    updatedAt!: string | null;
}
