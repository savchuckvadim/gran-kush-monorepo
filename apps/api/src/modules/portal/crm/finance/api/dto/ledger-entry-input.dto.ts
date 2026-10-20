import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { FinanceAccount, LedgerDirection, LedgerDocumentType } from "@prisma/client";
import {
    IsBoolean,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    Length,
    Max,
    MaxLength,
    Min,
} from "class-validator";

import { FINANCE_LIMITS } from "../../finance.limits";

import { IsCalendarDate } from "./calendar-date.decorator";

export const DIRECTION = { enum: LedgerDirection, enumName: "LedgerDirection" } as const;
export const ACCOUNT = {
    enum: FinanceAccount,
    enumName: "FinanceAccount",
    description: "cash — касса клуба, bank — счёт в банке, card — карта",
} as const;
export const DOCUMENT_TYPE = { enum: LedgerDocumentType, enumName: "LedgerDocumentType" } as const;

const MIN_AMOUNT = 0.01;
const DESCRIPTION_LIMIT = 500;
const NOTES_LIMIT = 2000;
const DOCUMENT_NUMBER_LIMIT = 60;

/** Проводка целиком: запись (`POST`) и правка ручной проводки (`PUT`). */
export class LedgerEntryInputDto {
    @ApiProperty(DIRECTION)
    @IsEnum(LedgerDirection)
    direction!: LedgerDirection;

    @ApiProperty({ type: String, example: "2026-10-05", description: "Дата операции" })
    @IsCalendarDate()
    occurredOn!: string;

    @ApiPropertyOptional({
        type: String,
        format: "uuid",
        nullable: true,
        description: "У перевода нет",
    })
    @IsOptional()
    @IsUUID()
    categoryId?: string | null;

    @ApiProperty(ACCOUNT)
    @IsEnum(FinanceAccount)
    account!: FinanceAccount;

    @ApiPropertyOptional({ ...ACCOUNT, nullable: true, description: "Перевод: куда пришли деньги" })
    @IsOptional()
    @IsEnum(FinanceAccount)
    toAccount?: FinanceAccount | null;

    @ApiProperty({ type: Number, example: 121, minimum: MIN_AMOUNT, description: "Евро" })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(MIN_AMOUNT)
    @Max(FINANCE_LIMITS.maxEntryAmount)
    amount!: number;

    @ApiPropertyOptional({
        type: Boolean,
        default: true,
        description: "Сумма с налогом (чек); false — база без IVA (фактура)",
    })
    @IsOptional()
    @IsBoolean()
    amountIncludesTax?: boolean;

    @ApiPropertyOptional({
        type: String,
        format: "uuid",
        nullable: true,
        description: "Ставка клуба; пусто — по статье или направлению",
    })
    @IsOptional()
    @IsUUID()
    taxRateId?: string | null;

    @ApiPropertyOptional({
        type: Number,
        example: 15,
        minimum: 0,
        maximum: 100,
        description: "IRPF, %",
    })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @Max(100)
    withholdingPercent?: number;

    @ApiProperty({ type: String, example: "Alquiler del local" })
    @IsString()
    @Length(1, DESCRIPTION_LIMIT)
    description!: string;

    @ApiPropertyOptional({ type: String, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(NOTES_LIMIT)
    notes?: string | null;

    @ApiPropertyOptional({ type: String, format: "uuid", nullable: true })
    @IsOptional()
    @IsUUID()
    counterpartyId?: string | null;

    @ApiPropertyOptional({
        type: String,
        format: "uuid",
        nullable: true,
        description: "Участник клуба — контрагент (взнос); важнее counterpartyId",
    })
    @IsOptional()
    @IsUUID()
    memberId?: string | null;

    @ApiPropertyOptional({ ...DOCUMENT_TYPE, default: LedgerDocumentType.none })
    @IsOptional()
    @IsEnum(LedgerDocumentType)
    documentType?: LedgerDocumentType;

    @ApiPropertyOptional({ type: String, nullable: true, example: "F-2026-118" })
    @IsOptional()
    @IsString()
    @MaxLength(DOCUMENT_NUMBER_LIMIT)
    documentNumber?: string | null;

    @ApiPropertyOptional({
        type: String,
        nullable: true,
        description: "Дата документа, если другая",
    })
    @IsOptional()
    @IsCalendarDate()
    documentDate?: string | null;

    @ApiPropertyOptional({ type: String, nullable: true, description: "Дата оплаты" })
    @IsOptional()
    @IsCalendarDate()
    paidOn?: string | null;

    @ApiPropertyOptional({
        type: Boolean,
        description: "Записать, хотя у контрагента уже проведён документ с этим номером",
    })
    @IsOptional()
    @IsBoolean()
    allowDuplicate?: boolean;
}

/** Разметка без сумм: статья, счёт, заметки (`PATCH`). */
export class ReclassifyEntryDto {
    @ApiPropertyOptional({ type: String, format: "uuid" })
    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @ApiPropertyOptional(ACCOUNT)
    @IsOptional()
    @IsEnum(FinanceAccount)
    account?: FinanceAccount;

    @ApiPropertyOptional({ type: String, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(NOTES_LIMIT)
    notes?: string | null;
}
