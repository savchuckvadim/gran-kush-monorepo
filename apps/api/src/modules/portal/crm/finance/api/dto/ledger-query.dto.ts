import { ApiProperty, ApiPropertyOptional, IntersectionType, PickType } from "@nestjs/swagger";

import { FinanceAccount, LedgerDirection } from "@prisma/client";
import { IsEnum, IsOptional, IsUUID } from "class-validator";

import { IsQueryBoolean } from "@common/decorators/dto/query-boolean.decorator";
import { PaginationDto } from "@common/paginate/dto/pagination.dto";

import { LEDGER_FILE_FORMATS, type LedgerFileFormat } from "../../application/ledger-files";
import type { ExportBook } from "../../application/use-cases/export-ledger.use-case";

import { IsCalendarDate } from "./calendar-date.decorator";
import { ACCOUNT, DIRECTION } from "./ledger-entry-input.dto";

export class LedgerFilterDto {
    @ApiPropertyOptional({ type: String, example: "2026-10-01" })
    @IsOptional()
    @IsCalendarDate()
    from?: string;

    @ApiPropertyOptional({ type: String, example: "2026-10-31" })
    @IsOptional()
    @IsCalendarDate()
    to?: string;

    @ApiPropertyOptional(DIRECTION)
    @IsOptional()
    @IsEnum(LedgerDirection)
    direction?: LedgerDirection;

    @ApiPropertyOptional({ type: String, format: "uuid" })
    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @ApiPropertyOptional({ type: String, format: "uuid" })
    @IsOptional()
    @IsUUID()
    counterpartyId?: string;

    @ApiPropertyOptional(ACCOUNT)
    @IsOptional()
    @IsEnum(FinanceAccount)
    account?: FinanceAccount;

    @ApiPropertyOptional({ type: Boolean, description: "Вместе с отменёнными" })
    @IsOptional()
    @IsQueryBoolean()
    includeVoid?: boolean;
}

/** Страница реестра: новые сверху, порядок по дате операции. */
export class LedgerListQueryDto extends IntersectionType(
    PickType(PaginationDto, ["page", "limit"] as const),
    LedgerFilterDto
) {}

export class PeriodRangeDto {
    @ApiProperty({ type: String, example: "2026-10-01" })
    @IsCalendarDate()
    from!: string;

    @ApiProperty({ type: String, example: "2026-10-31" })
    @IsCalendarDate()
    to!: string;
}

const FORMAT = {
    enum: LEDGER_FILE_FORMATS,
    enumName: "LedgerFileFormat",
    default: "xlsx",
} as const;

export const EXPORT_BOOKS = [
    "entries",
    "purchases",
    "sales",
] as const satisfies readonly ExportBook[];

export class ExportQueryDto extends PeriodRangeDto {
    @ApiProperty({
        enum: EXPORT_BOOKS,
        enumName: "LedgerExportBook",
        description: "entries — проводки; purchases — compras y gastos; sales — ventas e ingresos",
    })
    @IsEnum(EXPORT_BOOKS)
    book!: ExportBook;

    @ApiPropertyOptional(FORMAT)
    @IsOptional()
    @IsEnum(LEDGER_FILE_FORMATS)
    format?: LedgerFileFormat;
}

export class TemplateQueryDto {
    @ApiPropertyOptional(FORMAT)
    @IsOptional()
    @IsEnum(LEDGER_FILE_FORMATS)
    format?: LedgerFileFormat;
}

export class ImportQueryDto {
    @ApiPropertyOptional({
        type: Boolean,
        default: false,
        description: "false — только проверить и показать отчёт; true — записать подходящие строки",
    })
    @IsOptional()
    @IsQueryBoolean()
    commit?: boolean;
}
