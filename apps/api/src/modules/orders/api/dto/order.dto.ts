import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { OrderStatus, PaymentStatus } from "@orders/domain/entity/order.entity";
import { Type } from "class-transformer";
import {
    ArrayMinSize,
    IsArray,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    Min,
    ValidateNested,
} from "class-validator";

// ═══════════════════════════════════════════════════════════════════════════════
// Вложенные DTO
// ═══════════════════════════════════════════════════════════════════════════════

/** Единица измерения продукта (вложенная) */
export class OrderItemMeasurementUnitDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    id: string;

    @ApiProperty({ example: "gram", type: String })
    name: string;

    @ApiProperty({ example: "g", type: String })
    code: string;
}

/** Продукт в позиции заказа (вложенная) */
export class OrderItemProductDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    id: string;

    @ApiProperty({ example: "OG Kush", type: String })
    name: string;

    @ApiPropertyOptional({ example: "SKU-001", type: String, nullable: true })
    sku?: string | null;

    @ApiPropertyOptional({ example: "/storage/products/img.jpg", type: String, nullable: true })
    imageUrl?: string | null;

    @ApiPropertyOptional({ type: () => OrderItemMeasurementUnitDto })
    measurementUnit?: OrderItemMeasurementUnitDto;
}

/** Информация о члене клуба в заказе (вложенная) */
export class OrderMemberDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    id: string;

    @ApiProperty({ example: "John", type: String })
    name: string;

    @ApiPropertyOptional({ example: "Doe", type: String, nullable: true })
    surname?: string | null;

    @ApiPropertyOptional({ example: "MBR-0042", type: String, nullable: true })
    membershipNumber?: string | null;
}

/** Информация о сотруднике в заказе (вложенная) */
export class OrderEmployeeDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    id: string;

    @ApiProperty({ example: "Admin", type: String })
    name: string;

    @ApiPropertyOptional({ example: "User", type: String, nullable: true })
    surname?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OrderItem Response DTO
// ═══════════════════════════════════════════════════════════════════════════════

export class OrderItemDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    id: string;

    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    productId: string;

    @ApiProperty({ example: 2.5, type: Number, description: "Количество" })
    quantity: number;

    @ApiProperty({ example: 15.5, type: Number, description: "Цена за единицу на момент заказа" })
    unitPrice: number;

    @ApiProperty({ example: 38.75, type: Number, description: "Итого по позиции" })
    totalPrice: number;

    @ApiPropertyOptional({ example: "Без стеблей", type: String, nullable: true })
    notes?: string | null;

    @ApiProperty({ type: () => OrderItemProductDto })
    product: OrderItemProductDto;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Order Response — список
// ═══════════════════════════════════════════════════════════════════════════════

export class OrderListDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    id: string;

    @ApiProperty({ example: "ORD-20260316-0001", type: String })
    orderNumber: string;

    @ApiProperty({ enum: OrderStatus, example: OrderStatus.PENDING })
    status: string;

    @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.PENDING })
    paymentStatus: string;

    @ApiProperty({ example: 38.75, type: Number })
    subtotal: number;

    @ApiProperty({ example: 0, type: Number })
    discount: number;

    @ApiProperty({ example: 38.75, type: Number })
    total: number;

    @ApiProperty({ example: 3, type: Number, description: "Количество позиций в заказе" })
    itemsCount: number;

    @ApiProperty({ example: "2026-03-16T14:30:00.000Z", type: String })
    orderedAt: string;

    @ApiProperty({ type: () => OrderMemberDto })
    member: OrderMemberDto;

    @ApiPropertyOptional({ type: () => OrderEmployeeDto, nullable: true })
    employee?: OrderEmployeeDto | null;

    @ApiProperty({ example: "2026-03-16T14:30:00.000Z", type: String })
    createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Order Response — деталка
// ═══════════════════════════════════════════════════════════════════════════════

export class OrderDetailDto extends OrderListDto {
    @ApiPropertyOptional({ example: "Пожалуйста, побыстрее", type: String, nullable: true })
    notes?: string | null;

    @ApiPropertyOptional({ example: "VIP клиент, дать скидку", type: String, nullable: true })
    adminNotes?: string | null;

    @ApiPropertyOptional({ example: "2026-03-16T14:35:00.000Z", type: String, nullable: true })
    confirmedAt?: string | null;

    @ApiPropertyOptional({ example: "2026-03-16T14:40:00.000Z", type: String, nullable: true })
    preparedAt?: string | null;

    @ApiPropertyOptional({ example: "2026-03-16T14:50:00.000Z", type: String, nullable: true })
    readyAt?: string | null;

    @ApiPropertyOptional({ example: "2026-03-16T15:00:00.000Z", type: String, nullable: true })
    completedAt?: string | null;

    @ApiPropertyOptional({ example: null, type: String, nullable: true })
    cancelledAt?: string | null;

    @ApiProperty({ type: () => [OrderItemDto] })
    items: OrderItemDto[];

    @ApiProperty({ example: "2026-03-16T14:30:00.000Z", type: String })
    updatedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Create Order
// ═══════════════════════════════════════════════════════════════════════════════

/** Позиция для создания заказа */
export class CreateOrderItemDto {
    @ApiProperty({
        example: "550e8400-e29b-41d4-a716-446655440000",
        type: String,
        description: "ID товара",
    })
    @IsUUID()
    @IsNotEmpty()
    productId: string;

    @ApiProperty({ example: 2.5, type: Number, description: "Количество" })
    @IsNumber({ maxDecimalPlaces: 3 })
    @Min(0.001)
    quantity: number;

    @ApiPropertyOptional({ example: "Без стеблей", type: String })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    notes?: string;
}

/** Запрос на создание заказа */
export class CreateOrderDto {
    @ApiProperty({
        type: [CreateOrderItemDto],
        description: "Список позиций заказа (минимум 1)",
    })
    @IsArray()
    @ArrayMinSize(1, { message: "Заказ должен содержать хотя бы одну позицию" })
    @ValidateNested({ each: true })
    @Type(() => CreateOrderItemDto)
    items: CreateOrderItemDto[];

    @ApiPropertyOptional({ example: "Побыстрее, пожалуйста", type: String })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Update Order Status (CRM)
// ═══════════════════════════════════════════════════════════════════════════════

export class UpdateOrderStatusDto {
    @ApiProperty({
        enum: OrderStatus,
        example: OrderStatus.CONFIRMED,
        description: "Новый статус заказа",
    })
    @IsEnum(OrderStatus, {
        message: `Допустимые статусы: ${Object.values(OrderStatus).join(", ")}`,
    })
    status: OrderStatus;

    @ApiPropertyOptional({
        example: "Подтверждён, начинаем готовить",
        type: String,
        description: "Примечание от сотрудника",
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    adminNotes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Update Payment Status (CRM)
// ═══════════════════════════════════════════════════════════════════════════════

export class UpdatePaymentStatusDto {
    @ApiProperty({
        enum: PaymentStatus,
        example: PaymentStatus.PAID,
        description: "Новый статус оплаты",
    })
    @IsEnum(PaymentStatus, {
        message: `Допустимые статусы: ${Object.values(PaymentStatus).join(", ")}`,
    })
    paymentStatus: PaymentStatus;

    @ApiPropertyOptional({
        example: "cash",
        type: String,
        description: 'Способ оплаты ("cash", "card", "crypto")',
    })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    paymentMethod?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Order Filters (Query)
// ═══════════════════════════════════════════════════════════════════════════════

export class OrderFilterDto {
    @ApiPropertyOptional({
        enum: OrderStatus,
        example: OrderStatus.PENDING,
    })
    @IsOptional()
    @IsEnum(OrderStatus)
    status?: OrderStatus;

    @ApiPropertyOptional({
        enum: PaymentStatus,
        example: PaymentStatus.PENDING,
    })
    @IsOptional()
    @IsEnum(PaymentStatus)
    paymentStatus?: PaymentStatus;

    @ApiPropertyOptional({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    @IsOptional()
    @IsUUID()
    memberId?: string;

    @ApiPropertyOptional({
        example: "ORD-2026",
        type: String,
        description: "Поиск по номеру заказа",
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({
        example: "2026-03-01T00:00:00.000Z",
        type: String,
        description: "Начало периода",
    })
    @IsOptional()
    @Type(() => Date)
    startDate?: Date;

    @ApiPropertyOptional({
        example: "2026-03-31T23:59:59.000Z",
        type: String,
        description: "Конец периода",
    })
    @IsOptional()
    @Type(() => Date)
    endDate?: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Cancel Order (Member)
// ═══════════════════════════════════════════════════════════════════════════════

export class CancelOrderDto {
    @ApiPropertyOptional({ example: "Передумал", type: String, description: "Причина отмены" })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    reason?: string;
}
