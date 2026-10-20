import { ApiProperty, ApiPropertyOptional, IntersectionType, PickType } from "@nestjs/swagger";

import { StockMoveReason } from "@prisma/client";
import { IsEnum, IsIn, IsNumber, IsOptional, IsString, IsUUID, Length, Min } from "class-validator";

import { PaginationDto } from "@common/paginate/dto/pagination.dto";
import { IsCalendarDate } from "@modules/portal/crm/finance/api/dto/calendar-date.decorator";

import { MANUAL_MOVE_REASONS, type ManualMoveReason } from "../../domain/stock-move";

const UNITS = { type: Number, description: "Единиц товара, до трёх знаков" } as const;
const EUROS = { type: Number, description: "Евро" } as const;
const QUANTITY_DECIMALS = 3;
const COST_DECIMALS = 4;
const NOTE_LIMIT = 500;

export class StockMoveDto {
    @ApiProperty({ type: String, format: "uuid" })
    id!: string;

    @ApiProperty({ type: String, format: "uuid" })
    productId!: string;

    @ApiProperty({ type: String })
    productName!: string;

    @ApiProperty({ enum: StockMoveReason, enumName: "StockMoveReason" })
    reason!: StockMoveReason;

    @ApiProperty({ ...UNITS, description: "Приход — плюс, расход — минус" })
    quantity!: number;

    @ApiProperty({ ...EUROS, description: "Себестоимость единицы на момент движения" })
    unitCost!: number;

    @ApiProperty(UNITS)
    balanceAfter!: number;

    @ApiProperty({ type: String, format: "uuid", nullable: true })
    orderId!: string | null;

    @ApiProperty({ type: String, format: "uuid", nullable: true })
    purchaseId!: string | null;

    @ApiProperty({ type: String, nullable: true })
    note!: string | null;

    @ApiProperty({ type: String, nullable: true, description: "Кто записал; система — null" })
    employeeName!: string | null;

    @ApiProperty({ type: String, format: "date-time" })
    occurredAt!: string;
}

export class StockStateDto {
    @ApiProperty({ type: String, format: "uuid" })
    productId!: string;

    @ApiProperty(UNITS)
    currentQuantity!: number;

    @ApiProperty({
        ...EUROS,
        nullable: true,
        description: "Средняя себестоимость единицы; null — поставок не было",
    })
    averageCost!: number | null;

    @ApiProperty({ ...EUROS, nullable: true, description: "Остаток по себестоимости" })
    stockValue!: number | null;
}

export class PurchaseDto {
    @ApiProperty({ type: String, format: "uuid" })
    id!: string;

    @ApiProperty({ type: String, format: "uuid" })
    productId!: string;

    @ApiProperty({ type: String })
    productName!: string;

    @ApiProperty(UNITS)
    quantity!: number;

    @ApiProperty({ ...EUROS, description: "Цена закупки единицы без налога" })
    unitCost!: number;

    @ApiProperty({ ...EUROS, description: "Сумма поставки без налога" })
    total!: number;

    @ApiProperty({ type: String, format: "uuid", nullable: true })
    counterpartyId!: string | null;

    @ApiProperty({ type: String, nullable: true })
    counterpartyName!: string | null;

    @ApiProperty({
        type: String,
        format: "uuid",
        nullable: true,
        description: "Проводка расхода в учёте",
    })
    ledgerEntryId!: string | null;

    @ApiProperty({ type: String, example: "2026-10-05" })
    receivedOn!: string;

    @ApiProperty({ type: String, nullable: true })
    employeeName!: string | null;
}

export class ReceivePurchaseDto {
    @ApiProperty({ type: String, format: "uuid" })
    @IsUUID()
    productId!: string;

    @ApiProperty({ ...UNITS, example: 100 })
    @IsNumber({ maxDecimalPlaces: QUANTITY_DECIMALS })
    @Min(0.001)
    quantity!: number;

    @ApiProperty({ ...EUROS, example: 4.5, description: "Цена закупки единицы без налога" })
    @IsNumber({ maxDecimalPlaces: COST_DECIMALS })
    @Min(0)
    unitCost!: number;

    @ApiPropertyOptional({
        type: String,
        format: "uuid",
        nullable: true,
        description: "Поставщик, если есть фактура",
    })
    @IsOptional()
    @IsUUID()
    counterpartyId?: string | null;

    @ApiProperty({ type: String, example: "2026-10-05", description: "Дата прихода" })
    @IsCalendarDate()
    receivedOn!: string;
}

export class ManualStockMoveDto {
    @ApiProperty({ type: String, format: "uuid" })
    @IsUUID()
    productId!: string;

    @ApiProperty({
        enum: MANUAL_MOVE_REASONS,
        enumName: "ManualStockMoveReason",
        description: "write_off — брак, gift — подарок, recount — пересчёт",
    })
    @IsIn(MANUAL_MOVE_REASONS)
    reason!: ManualMoveReason;

    @ApiProperty({
        ...UNITS,
        example: 2,
        description: "Сколько списать; у пересчёта — разница со знаком",
    })
    @IsNumber({ maxDecimalPlaces: QUANTITY_DECIMALS })
    quantity!: number;

    @ApiProperty({
        type: String,
        example: "Пересохло, списано",
        description: "Причина обязательна",
    })
    @IsString()
    @Length(1, NOTE_LIMIT)
    note!: string;
}

export class StockMovesQueryDto extends IntersectionType(
    PickType(PaginationDto, ["page", "limit"] as const)
) {
    @ApiPropertyOptional({ type: String, format: "uuid" })
    @IsOptional()
    @IsUUID()
    productId?: string;
}

export class PurchasesQueryDto extends IntersectionType(
    PickType(PaginationDto, ["page", "limit"] as const)
) {
    @ApiPropertyOptional({ type: String, format: "uuid" })
    @IsOptional()
    @IsUUID()
    productId?: string;

    @ApiPropertyOptional({ type: String, example: "2026-10-01" })
    @IsOptional()
    @IsCalendarDate()
    from?: string;

    @ApiPropertyOptional({ type: String, example: "2026-10-31" })
    @IsOptional()
    @IsCalendarDate()
    to?: string;
}

export class ReceivedPurchaseDto {
    @ApiProperty({ type: String, format: "uuid" })
    purchaseId!: string;

    @ApiProperty({ type: () => StockMoveDto })
    move!: StockMoveDto;

    @ApiProperty({
        type: String,
        format: "uuid",
        nullable: true,
        description: "Проводка расхода; null — финансы выключены",
    })
    ledgerEntryId!: string | null;

    @ApiProperty({ type: () => StockStateDto })
    stock!: StockStateDto;
}
