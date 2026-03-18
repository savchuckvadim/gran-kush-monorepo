import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import {
    PaymentMethod,
    TransactionDirection,
    TransactionType,
} from "@finance/domain/entity/financial-transaction.entity";
import { Type } from "class-transformer";
import {
    IsDateString,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    Min,
} from "class-validator";

// ═══════════════════════════════════════════════════════════════════════════════
// Вложенные DTO
// ═══════════════════════════════════════════════════════════════════════════════

export class TransactionOrderDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    id: string;

    @ApiProperty({ example: "ORD-20260316-0001", type: String })
    orderNumber: string;

    @ApiProperty({ example: "completed", type: String })
    status: string;
}

export class TransactionMemberDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    id: string;

    @ApiProperty({ example: "John", type: String })
    name: string;

    @ApiPropertyOptional({ example: "Doe", type: String, nullable: true })
    surname?: string | null;

    @ApiPropertyOptional({ example: "MBR-0042", type: String, nullable: true })
    membershipNumber?: string | null;
}

export class TransactionEmployeeDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    id: string;

    @ApiProperty({ example: "Admin", type: String })
    name: string;

    @ApiPropertyOptional({ example: "User", type: String, nullable: true })
    surname?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Transaction Response — список
// ═══════════════════════════════════════════════════════════════════════════════

export class FinancialTransactionListDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    id: string;

    @ApiProperty({ enum: TransactionType, example: TransactionType.ORDER_PAYMENT })
    type: string;

    @ApiProperty({ enum: TransactionDirection, example: TransactionDirection.INCOME })
    direction: string;

    @ApiProperty({ example: 38.75, type: Number })
    amount: number;

    @ApiProperty({ example: "EUR", type: String })
    currency: string;

    @ApiPropertyOptional({ enum: PaymentMethod, example: PaymentMethod.CASH })
    paymentMethod?: string | null;

    @ApiPropertyOptional({
        example: "Оплата заказа ORD-20260316-0001",
        type: String,
        nullable: true,
    })
    description?: string | null;

    @ApiProperty({ example: "2026-03-16T14:30:00.000Z", type: String })
    transactionDate: string;

    @ApiPropertyOptional({ type: () => TransactionOrderDto, nullable: true })
    order?: TransactionOrderDto | null;

    @ApiPropertyOptional({ type: () => TransactionMemberDto, nullable: true })
    member?: TransactionMemberDto | null;

    @ApiPropertyOptional({ type: () => TransactionEmployeeDto, nullable: true })
    createdByEmployee?: TransactionEmployeeDto | null;

    @ApiProperty({ example: "2026-03-16T14:30:00.000Z", type: String })
    createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Transaction Response — деталка
// ═══════════════════════════════════════════════════════════════════════════════

export class FinancialTransactionDetailDto extends FinancialTransactionListDto {
    @ApiPropertyOptional({
        example: "550e8400-e29b-41d4-a716-446655440000",
        type: String,
        nullable: true,
    })
    orderId?: string | null;

    @ApiPropertyOptional({
        example: "550e8400-e29b-41d4-a716-446655440000",
        type: String,
        nullable: true,
    })
    memberId?: string | null;

    @ApiPropertyOptional({ example: "Внутренний перевод", type: String, nullable: true })
    notes?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Create Transaction (Manual)
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateFinancialTransactionDto {
    @ApiPropertyOptional({
        example: "550e8400-e29b-41d4-a716-446655440000",
        type: String,
        description: "ID заказа (если транзакция привязана к заказу)",
    })
    @IsOptional()
    @IsUUID()
    orderId?: string;

    @ApiPropertyOptional({
        example: "550e8400-e29b-41d4-a716-446655440000",
        type: String,
        description: "ID члена клуба",
    })
    @IsOptional()
    @IsUUID()
    memberId?: string;

    @ApiProperty({
        enum: TransactionType,
        example: TransactionType.MANUAL,
        description: "Тип транзакции",
    })
    @IsEnum(TransactionType, {
        message: `Допустимые типы: ${Object.values(TransactionType).join(", ")}`,
    })
    type: TransactionType;

    @ApiProperty({
        enum: TransactionDirection,
        example: TransactionDirection.INCOME,
        description: "Направление: доход или расход",
    })
    @IsEnum(TransactionDirection, {
        message: `Допустимые направления: ${Object.values(TransactionDirection).join(", ")}`,
    })
    direction: TransactionDirection;

    @ApiProperty({ example: 50.0, type: Number, description: "Сумма транзакции" })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01, { message: "Сумма должна быть больше 0" })
    amount: number;

    @ApiPropertyOptional({ example: "EUR", type: String, default: "EUR" })
    @IsOptional()
    @IsString()
    @MaxLength(3)
    currency?: string;

    @ApiPropertyOptional({
        enum: PaymentMethod,
        example: PaymentMethod.CASH,
        description: "Способ оплаты",
    })
    @IsOptional()
    @IsEnum(PaymentMethod)
    paymentMethod?: PaymentMethod;

    @ApiPropertyOptional({ example: "Оплата за доп. услуги", type: String })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @ApiPropertyOptional({ example: "Примечание для бухгалтерии", type: String })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Filters (Query)
// ═══════════════════════════════════════════════════════════════════════════════

export class TransactionFilterDto {
    @ApiPropertyOptional({ enum: TransactionType })
    @IsOptional()
    @IsEnum(TransactionType)
    type?: TransactionType;

    @ApiPropertyOptional({ enum: TransactionDirection })
    @IsOptional()
    @IsEnum(TransactionDirection)
    direction?: TransactionDirection;

    @ApiPropertyOptional({ enum: PaymentMethod })
    @IsOptional()
    @IsEnum(PaymentMethod)
    paymentMethod?: PaymentMethod;

    @ApiPropertyOptional({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    @IsOptional()
    @IsUUID()
    memberId?: string;

    @ApiPropertyOptional({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    @IsOptional()
    @IsUUID()
    orderId?: string;

    @ApiPropertyOptional({
        example: "оплата",
        type: String,
        description: "Поиск по описанию/примечанию",
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ example: "2026-03-01T00:00:00.000Z", type: String })
    @IsOptional()
    @Type(() => Date)
    startDate?: Date;

    @ApiPropertyOptional({ example: "2026-03-31T23:59:59.000Z", type: String })
    @IsOptional()
    @Type(() => Date)
    endDate?: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Reports DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class ReportPeriodDto {
    @ApiProperty({
        example: "2026-03-01",
        type: String,
        description: "Начало периода (YYYY-MM-DD)",
    })
    @IsNotEmpty()
    @IsDateString()
    startDate: string;

    @ApiProperty({ example: "2026-03-31", type: String, description: "Конец периода (YYYY-MM-DD)" })
    @IsNotEmpty()
    @IsDateString()
    endDate: string;
}

/** Суммарная статистика */
export class TransactionSummaryDto {
    @ApiProperty({ example: 5000.0, type: Number, description: "Общий доход" })
    totalIncome: number;

    @ApiProperty({ example: 200.0, type: Number, description: "Общие расходы" })
    totalExpense: number;

    @ApiProperty({ example: 4800.0, type: Number, description: "Чистый итог (доход - расход)" })
    netTotal: number;

    @ApiProperty({ example: 42, type: Number, description: "Количество транзакций" })
    transactionCount: number;
}

/** Группировка по типу */
export class TransactionGroupedByTypeDto {
    @ApiProperty({ enum: TransactionType, example: TransactionType.ORDER_PAYMENT })
    type: string;

    @ApiProperty({ enum: TransactionDirection, example: TransactionDirection.INCOME })
    direction: string;

    @ApiProperty({ example: 30, type: Number })
    count: number;

    @ApiProperty({ example: 4500.0, type: Number })
    totalAmount: number;
}

/** Группировка по дате (для графиков) */
export class TransactionGroupedByDateDto {
    @ApiProperty({ example: "2026-03-16", type: String })
    date: string;

    @ApiProperty({ example: 500.0, type: Number })
    income: number;

    @ApiProperty({ example: 50.0, type: Number })
    expense: number;

    @ApiProperty({ example: 450.0, type: Number })
    net: number;

    @ApiProperty({ example: 8, type: Number })
    count: number;
}
